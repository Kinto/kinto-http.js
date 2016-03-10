"use strict";

import "isomorphic-fetch";
import { EventEmitter } from "events";

import { partition, pMap, omit, checkVersion } from "./utils";
import HTTP from "./http";
import endpoint from "./endpoint";
import * as requests from "./requests";
import { createBatch, aggregate } from "./batch";
import Bucket from "./bucket";


/**
 * Currently supported protocol version.
 * @type {String}
 */
export const SUPPORTED_PROTOCOL_VERSION = "v1";

/**
 * High level HTTP client for the Kinto API.
 *
 * @example
 * const client = new KintoClient("https://kinto.dev.mozaws.net/v1");
 * client.bucket("default")
*    .collection("my-blog")
*    .createRecord({title: "First article"})
 *   .then(console.log.bind(console))
 *   .catch(console.error.bind(console));
 */
export default class KintoClient {
  /**
   * Constructor.
   *
   * @param  {String} remote  The remote URL.
   * @param  {Object}  options The options object.
   * @param  {Boolean} options.safe        Adds concurrency headers to every
   * requests (default: `true`).
   * @param  {EventEmitter} options.events The events handler. If none provided
   * an `EventEmitter` instance will be created.
   * @param  {Object}  options.headers     The key-value headers to pass to each
   * request (default: `{}`).
   * @param  {String}  options.bucket      The default bucket to use (default:
   * `"default"`)
   * @param  {String}  options.requestMode The HTTP request mode (from ES6 fetch
   * spec).
   */
  constructor(remote, options={}) {
    if (typeof(remote) !== "string" || !remote.length) {
      throw new Error("Invalid remote URL: " + remote);
    }
    if (remote[remote.length-1] === "/") {
      remote = remote.slice(0, -1);
    }
    this._backoffReleaseTime = null;
    /**
     * Default request options container.
     * @private
     * @type {Object}
     */
    this.defaultReqOptions = {
      bucket:  options.bucket  || "default",
      headers: options.headers || {},
      safe:    !!options.safe,
    };

    // public properties
    /**
     * The remote server base URL.
     * @type {String}
     */
    this.remote = remote;
    /**
     * Current server information.
     * @ignore
     * @type {Object|null}
     */
    this.serverInfo = null;
    /**
     * The event emitter instance. Should comply with the `EventEmitter`
     * interface.
     * @ignore
     * @type {EventEmitter}
     */
    this.events = options.events || new EventEmitter();

    /**
     * The HTTP instance.
     * @ignore
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

  /**
   * @ignore
   */
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
   * @type {Number}
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
   * @private
   */
  _registerHTTPEvents() {
    this.events.on("backoff", backoffMs => {
      this._backoffReleaseTime = backoffMs;
    });
  }

  /**
   * Conditionnaly executes provided function if current server http_api_version
   * supports it and returns a Promise resolving with its result when the
   * condition is satisfied, rejects when it's not.
   *
   * @ignore
   * @param  {String}   min  The minimum protocol version required (inclusive).
   * @param  {String}   max  The maximum protocol version required (exclusive).
   * @param  {Function} fn   The function to resolve with.
   * @return {Promise<Object, Error>}
   */
  ensureSupported(min, max, fn) {
    return this.fetchHTTPApiVersion()
      .then(currentVersion => {
        checkVersion(currentVersion, min, max);
        return fn();
      });
  }

  /**
   * Retrieve a bucket object to perform operations on it.
   *
   * @param  {String}  name    The bucket name.
   * @param  {Object}  options The request options.
   * @param  {Boolean} safe    The resulting safe option.
   * @param  {String}  bucket  The resulting bucket name option.
   * @param  {Object}  headers The extended headers object option.
   * @return {Bucket}
   */
  bucket(name, options={}) {
    const bucketOptions = omit(this._getRequestOptions(options), "bucket");
    return new Bucket(this, name, bucketOptions);
  }

  /**
   * Generates a request options object, deeply merging the client configured
   * defaults with the ones provided as argument.
   *
   * Note: Headers won't be overriden but merged with instance default ones.
   *
   * @private
   * @param    {Object} options The request options.
   * @return   {Object}
   * @property {Boolean} safe    The resulting safe option.
   * @property {String}  bucket  The resulting bucket name option.
   * @property {Object}  headers The extended headers object option.
   */
  _getRequestOptions(options={}) {
    return {
      ...this.defaultReqOptions,
      ...options,
      // Note: headers should never be overriden but extended
      headers: {
        ...this.defaultReqOptions.headers,
        ...options.headers
      },
    };
  }

  /**
   * Retrieves server information and persist them locally. This operation is
   * usually performed a single time during the instance lifecycle.
   *
   * @return {Promise<Object, Error>}
   */
  fetchServerInfo() {
    if (this.serverInfo) {
      return Promise.resolve(this.serverInfo);
    }
    return this.http.request(this.remote + endpoint("root"), {
      headers: this.defaultReqOptions.headers
    })
      .then(({json}) => {
        this.serverInfo = json;
        return this.serverInfo;
      });
  }

  /**
   * Retrieves Kinto server settings.
   *
   * @return {Promise<Object, Error>}
   */
  fetchServerSettings() {
    return this.fetchServerInfo().then(({settings}) => settings);
  }

  /**
   * Retrieve server capabilities information.
   *
   * @return {Promise<Object, Error>}
   */
  fetchServerCapabilities() {
    return this.fetchServerInfo().then(({capabilities}) => capabilities);
  }

  /**
   * Retrieve authenticated user information.
   *
   * @return {Promise<Object, Error>}
   */
  fetchUser() {
    return this.fetchServerInfo().then(({user}) => user);
  }

  /**
   * Retrieve authenticated user information.
   *
   * @return {Promise<Object, Error>}
   */
  fetchHTTPApiVersion() {
    return this.fetchServerInfo().then(({http_api_version}) => {
      return http_api_version;
    });
  }

  /**
   * Process batch requests, chunking them according to the batch_max_requests
   * server setting when needed.
   *
   * @param  {Array}  requests The list of batch subrequests to perform.
   * @param  {Object} options  The options object.
   * @return {Promise<Object, Error>}
   */
  _batchRequests(requests, options = {}) {
    const headers = {...this.defaultReqOptions.headers, ...options.headers};
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
   * Note: Reserved for internal use only.
   *
   * @ignore
   * @param  {Function} fn      The function to use for describing batch ops.
   * @param  {Object}   options The options object.
   * @param  {Boolean}  options.safe      The safe option.
   * @param  {String}   options.bucket    The bucket name option.
   * @param  {Object}   options.headers   The headers object option.
   * @param  {Boolean}  options.aggregate Produces an aggregated result object
   * (default: `false`).
   * @return {Promise<Object, Error>}
   */
  batch(fn, options={}) {
    const batch = createBatch(this._getRequestOptions(options));
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
   * Executes an atomic HTTP request.
   *
   * @private
   * @param  {Object} request The request object.
   * @return {Promise<Object, Error>}
   */
  execute(request) {
    return this.fetchServerSettings()
      .then(_ => {
        return this.http.request(this.remote + request.path, {
          ...request,
          body: JSON.stringify(request.body)
        });
      });
  }

  /**
   * Retrieves the list of buckets.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object[], Error>}
   */
  listBuckets(options={}) {
    return this.execute({
      path: endpoint("buckets"),
      headers: {...this.defaultReqOptions.headers, ...options.headers}
    })
      .then(res => res.json);
  }

  /**
   * Creates a new bucket on the server.
   *
   * @param  {String}   bucketName      The bucket name.
   * @param  {Object}   options         The options object.
   * @param  {Boolean}  options.safe    The safe option.
   * @param  {Object}   options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  createBucket(bucketName, options={}) {
    const reqOptions = this._getRequestOptions(options);
    return this.execute(requests.createBucket(bucketName, reqOptions))
      .then(res => res.json);
  }

  /**
   * Deletes a bucket from the server.
   *
   * @ignore
   * @param  {Object|String} bucket          The bucket to delete.
   * @param  {Object}        options         The options object.
   * @param  {Boolean}       options.safe    The safe option.
   * @param  {Object}        options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  deleteBucket(bucket, options={}) {
    const _bucket = typeof bucket === "object" ? bucket : {id: bucket};
    const reqOptions = this._getRequestOptions(options);
    return this.execute(requests.deleteBucket(_bucket, reqOptions))
      .then(res => res.json);
  }

  /**
   * Deletes all buckets on the server.
   *
   * @ignore
   * @param  {Object}        options         The options object.
   * @param  {Boolean}       options.safe    The safe option.
   * @param  {Object}        options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  deleteBuckets(options={}) {
    const reqOptions = this._getRequestOptions(options);
    return this.execute(requests.deleteBuckets(reqOptions))
      .then(res => res.json);
  }
}
