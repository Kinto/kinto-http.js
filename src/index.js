"use strict";

import "isomorphic-fetch";
import { EventEmitter } from "events";

import { quote, unquote, partition, pMap } from "./utils.js";
import HTTP from "./http.js";
import endpoint from "./endpoint";
import * as requests from "./requests";
import { createBatch, aggregate } from "./batch";

/**
 * Currently supported protocol version.
 * @type {String}
 */
export const SUPPORTED_PROTOCOL_VERSION = "v1";

/**
 * High level HTTP client for the Kinto API.
 */
export default class KintoApi {
  /**
   * Constructor.
   *
   * Options:
   * - {EventEmitter} events      The events handler. If none provided an
   *                              `EventEmitter` instance will be created.
   * - {Object}       headers     The key-value headers to pass to each request.
   * - {String}       requestMode The HTTP request mode (from ES6 fetch spec).
   *
   * @param  {String} remote  The remote URL.
   * @param  {Object} options The options object.
   */
  constructor(remote, options={}) {
    if (typeof(remote) !== "string" || !remote.length) {
      throw new Error("Invalid remote URL: " + remote);
    }
    if (remote[remote.length-1] === "/") {
      remote = remote.slice(0, -1);
    }
    this._backoffReleaseTime = null;
    this.remote = remote;

    // public properties
    /**
     * The optional generic headers.
     * @type {Object}
     */
    this.optionHeaders = options.headers || {};
    /**
     * Current server settings, retrieved from the server.
     * @type {Object}
     */
    this.serverSettings = null;
    /**
     * The event emitter instance. Should comply with the `EventEmitter`
     * interface.
     * @type {EventEmitter}
     */
    this.events = options.events || new EventEmitter();

    /**
     * The HTTP instance.
     * @type {HTTP}
     */
    this.http = new HTTP(this.events, {requestMode: options.requestMode});
    this._registerHTTPEvents();
  }

  /**
   * The remote endpoint base URL. Setting the value will also extract and
   * validate the version.
   * @type {String}
   */
  get remote() {
    return this._remote;
  }

  set remote(url) {
    let version;
    try {
      version = url.match(/\/(v\d+)\/?$/)[1];
    } catch (err) {
      throw new Error("The remote URL must contain the version: " + url);
    }
    if (version !== SUPPORTED_PROTOCOL_VERSION) {
      throw new Error(`Unsupported protocol version: ${version}`);
    }
    this._remote = url;
    this._version = version;
  }

  /**
   * The current server protocol version, eg. `v1`.
   * @type {String}
   */
  get version() {
    return this._version;
  }

  /**
   * Backoff remaining time, in milliseconds. Defaults to zero if no backoff is
   * ongoing.
   *
   * @return {Number}
   */
  get backoff() {
    const currentTime = new Date().getTime();
    if (this._backoffReleaseTime && currentTime < this._backoffReleaseTime) {
      return this._backoffReleaseTime - currentTime;
    }
    return 0;
  }

  /**
   * Registers HTTP events.
   */
  _registerHTTPEvents() {
    this.events.on("backoff", backoffMs => {
      this._backoffReleaseTime = backoffMs;
    });
  }

  /**
   * Retrieves Kinto server settings.
   *
   * @return {Promise}
   */
  fetchServerSettings() {
    if (this.serverSettings) {
      return Promise.resolve(this.serverSettings);
    }
    return this.execute({path: endpoint("root")})
      .then(res => {
        this.serverSettings = res.json.settings;
        return this.serverSettings;
      });
  }

  /**
   * Fetches latest changes from the remote server.
   *
   * @param  {String} bucketName  The bucket name.
   * @param  {String} collName    The collection name.
   * @param  {Object} options     The options object.
   * @return {Promise}
   */
  fetchChangesSince(bucketName, collName, options={lastModified: null, headers: {}}) {
    const recordsUrl = endpoint("records", bucketName, collName);
    let queryString = "";
    const headers = {...this.optionHeaders, ...options.headers};

    if (options.lastModified) {
      queryString = "?_since=" + options.lastModified;
      headers["If-None-Match"] = quote(options.lastModified);
    }

    return this.fetchServerSettings()
      .then(_ => this.execute({path: recordsUrl + queryString, headers}))
      .then(res => {
        // If HTTP 304, nothing has changed
        if (res.status === 304) {
          return {
            lastModified: options.lastModified,
            changes: []
          };
        }
        // XXX: ETag are supposed to be opaque and stored «as-is».
        // Extract response data
        let etag = res.headers.get("ETag");  // e.g. '"42"'
        etag = etag ? parseInt(unquote(etag), 10) : options.lastModified;
        const records = res.json.data;

        // Check if server was flushed
        const localSynced = options.lastModified;
        const serverChanged = etag > options.lastModified;
        const emptyCollection = records ? records.length === 0 : true;
        if (localSynced && serverChanged && emptyCollection) {
          throw Error("Server has been flushed.");
        }

        return {lastModified: etag, changes: records};
      });
  }

  /**
   * Process batch requests, chunking them according to the batch_max_requests
   * server setting when needed.
   *
   * @param  {Array}  requests The list of batch subrequests to perform.
   * @param  {Object} options  The options object.
   * @return {Promise}
   */
  _batchRequests(requests, options = {}) {
    const headers = {...this.optionHeaders, ...options.headers};
    if (!requests.length) {
      return Promise.resolve([]);
    }
    return this.fetchServerSettings()
      .then(serverSettings => {
        const maxRequests = serverSettings["batch_max_requests"];
        if (maxRequests && requests.length > maxRequests) {
          const chunks = partition(requests, maxRequests);
          return pMap(chunks, chunk => this._batchRequests(chunk, options));
        }
        return this.execute({
          path: endpoint("batch"),
          method: "POST",
          headers: headers,
          body: {
            defaults: {headers},
            requests: requests
          }
        })
          // we only care about the responses
          .then(res => res.json.responses);
      });
  }

  /**
   * Sends batch requests to the remote server.
   *
   * Options:
   * - {Object}  headers   Headers to attach to main and all subrequests.
   * - {Boolean} safe      Safe update (default: `false`).
   * - {Boolean} bucket    Generic bucket to use (default: `"default"`).
   * - {Boolean} aggregate Produces an aggregated result object
   *   (default: `false`).
   *
   * @param  {Array}  requests The list of requests to batch execute.
   * @param  {Object} options  The options object.
   * @return {Promise}
   */
  batch(fn, options={}) {
    const { safe, bucket, headers } = {
      safe: false,
      bucket: "default",
      headers: {},
      ...options
    };
    const batch = createBatch({
      safe,
      bucket,
      headers: {
        ...this.optionHeaders,
        ...headers
      }
    });
    fn(batch);
    return this._batchRequests(batch.requests, options)
      .then((responses) => {
        if (options.aggregate) {
          return aggregate(responses, batch.requests);
        }
        return responses;
      });
  }

  /**
   * Executes an atomic request request.
   *
   * @param  {Object} request The request object.
   * @return {Promise<Object, Error>}
   */
  execute(request) {
    return this.http.request(this.remote + request.path, {
      ...request,
      body: JSON.stringify(request.body)
    });
  }

  /**
   * Creates a new bucket.
   *
   * Options:
   * - {Object} headers: The headers to attach to the HTTP request.
   *
   * @param  {String} bucketName The bucket name.
   * @param  {Object} options    The options object.
   * @return {Object}
   */
  createBucket(bucketName, options={}) {
    return this.execute(requests.createBucket(bucketName, {
      ...options,
      headers: {...this.optionHeaders, ...options.headers},
    })).then(res => res.json);
  }

  /**
   * Creates a new collection.
   *
   * Options:
   * - {String} bucket:  The bucket to create the collection within.
   * - {Object} headers: The headers to attach to the HTTP request.
   *
   * @param  {String} collName The collection name.
   * @param  {Object} options  The options object.
   * @return {Object}
   */
  createCollection(collName, options={}) {
    return this.execute(requests.createCollection(collName, {
      ...options,
      headers: {...this.optionHeaders, ...options.headers},
    })).then(res => res.json);
  }

  /**
   * Get every records from server.
   *
   * Options:
   *
   * - {String}  bucket   The bucket name.
   * - {Object}  headers  Headers to attach to main and all subrequests.
   * - {String}  sort     Sort field (prefixed with `-` for descending).
   *
   * @param  {String} collName    The collection name.
   * @param  {Object} options     The options object.
   * @return {Promise<{Object}, Error>}
   *
   * > Because of bug on server, order of record is not predictible.
   * > It is forced in default options here.
   * > https://github.com/Kinto/kinto/issues/434
   */
  getRecords(collName, options={}) {
    const { bucket, sort, headers } = {
      bucket: "default",
      sort: "-last_modified",
      headers: {},
      ...options
    };
    const path = endpoint("records", bucket, collName);
    const querystring = `?_sort=${sort}`;
    return this.execute({
      path: path + querystring,
      headers: {...this.optionHeaders, headers},
    }).then(res => res.json);
  }

  /**
   * Creates a record in a given collection.
   *
   * @param  {String} collName The collection name.
   * @param  {Object} record   The record object.
   * @param  {Object} options  The options object.
   * @return {Object}
   */
  createRecord(collName, record, options={}) {
    return this.execute(requests.createRecord(collName, record, {
      headers: {...this.optionHeaders, ...options.headers},
      ...options
    })).then(res => res.json);
  }
}
