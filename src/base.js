"use strict";

import {
  partition,
  pMap,
  omit,
  qsify,
  support,
  nobatch,
  toDataBody,
} from "./utils";
import HTTP from "./http";
import endpoint from "./endpoint";
import * as requests from "./requests";
import { aggregate } from "./batch";
import Bucket from "./bucket";
import { capable } from "./utils";

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
export default class KintoClientBase {
  /**
   * Constructor.
   *
   * @param  {String}       remote  The remote URL.
   * @param  {Object}       [options={}]                  The options object.
   * @param  {Boolean}      [options.safe=true]           Adds concurrency headers to every requests.
   * @param  {EventEmitter} [options.events=EventEmitter] The events handler instance.
   * @param  {Object}       [options.headers={}]          The key-value headers to pass to each request.
   * @param  {Object}       [options.retry=0]             Number of retries when request fails (default: 0)
   * @param  {String}       [options.bucket="default"]    The default bucket to use.
   * @param  {String}       [options.requestMode="cors"]  The HTTP request mode (from ES6 fetch spec).
   * @param  {Number}       [options.timeout=null]        The request timeout in ms, if any.
   */
  constructor(remote, options = {}) {
    if (typeof remote !== "string" || !remote.length) {
      throw new Error("Invalid remote URL: " + remote);
    }
    if (remote[remote.length - 1] === "/") {
      remote = remote.slice(0, -1);
    }
    this._backoffReleaseTime = null;

    /**
     * Default request options container.
     * @private
     * @type {Object}
     */
    this.defaultReqOptions = {
      bucket: options.bucket || "default",
      headers: options.headers || {},
      retry: options.retry || 0,
      safe: !!options.safe,
    };

    this._options = options;
    this._requests = [];
    this._isBatch = !!options.batch;

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
     * @type {Class}
     */
    this.events = options.events;

    const { requestMode, timeout } = options;
    /**
     * The HTTP instance.
     * @ignore
     * @type {HTTP}
     */
    this.http = new HTTP(this.events, { requestMode, timeout });
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
    // Prevent registering event from a batch client instance
    if (!this._isBatch) {
      this.events.on("backoff", backoffMs => {
        this._backoffReleaseTime = backoffMs;
      });
    }
  }

  /**
   * Retrieve a bucket object to perform operations on it.
   *
   * @param  {String}  name              The bucket name.
   * @param  {Object}  [options={}]      The request options.
   * @param  {Boolean} [options.safe]    The resulting safe option.
   * @param  {String}  [options.bucket]  The resulting bucket name option.
   * @param  {Object}  [options.headers] The extended headers object option.
   * @return {Bucket}
   */
  bucket(name, options = {}) {
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
   * @param    {Object}  [options={}]      The request options.
   * @property {Boolean} [options.safe]    The resulting safe option.
   * @property {String}  [options.bucket]  The resulting bucket name option.
   * @property {Object}  [options.headers] The extended headers object option.
   * @return   {Object}
   */
  _getRequestOptions(options = {}) {
    return {
      ...this.defaultReqOptions,
      ...options,
      batch: this._isBatch,
      // Note: headers should never be overriden but extended
      headers: {
        ...this.defaultReqOptions.headers,
        ...options.headers,
      },
    };
  }

  /**
   * Retrieves server information and persist them locally. This operation is
   * usually performed a single time during the instance lifecycle.
   *
   * @param  {Object}  [options={}] The request options.
   * @return {Promise<Object, Error>}
   */
  async fetchServerInfo(options = {}) {
    if (this.serverInfo) {
      return this.serverInfo;
    }
    const path = this.remote + endpoint("root");
    const reqOptions = this._getRequestOptions(options);
    const { json } = await this.http.request(path, reqOptions);
    this.serverInfo = json;
    return this.serverInfo;
  }

  /**
   * Retrieves Kinto server settings.
   *
   * @param  {Object}  [options={}] The request options.
   * @return {Promise<Object, Error>}
   */
  @nobatch("This operation is not supported within a batch operation.")
  async fetchServerSettings(options = {}) {
    const { settings } = await this.fetchServerInfo(options);
    return settings;
  }

  /**
   * Retrieve server capabilities information.
   *
   * @param  {Object}  [options={}] The request options.
   * @return {Promise<Object, Error>}
   */
  @nobatch("This operation is not supported within a batch operation.")
  async fetchServerCapabilities(options = {}) {
    const { capabilities } = await this.fetchServerInfo(options);
    return capabilities;
  }

  /**
   * Retrieve authenticated user information.
   *
   * @param  {Object}  [options={}] The request options.
   * @return {Promise<Object, Error>}
   */
  @nobatch("This operation is not supported within a batch operation.")
  async fetchUser(options = {}) {
    const { user } = await this.fetchServerInfo(options);
    return user;
  }

  /**
   * Retrieve authenticated user information.
   *
   * @param  {Object}  [options={}] The request options.
   * @return {Promise<Object, Error>}
   */
  @nobatch("This operation is not supported within a batch operation.")
  async fetchHTTPApiVersion(options = {}) {
    const { http_api_version } = await this.fetchServerInfo(options);
    return http_api_version;
  }

  /**
   * Process batch requests, chunking them according to the batch_max_requests
   * server setting when needed.
   *
   * @param  {Array}  requests     The list of batch subrequests to perform.
   * @param  {Object} [options={}] The options object.
   * @return {Promise<Object, Error>}
   */
  async _batchRequests(requests, options = {}) {
    const reqOptions = this._getRequestOptions(options);
    const { headers } = reqOptions;
    if (!requests.length) {
      return [];
    }
    const serverSettings = await this.fetchServerSettings();
    const maxRequests = serverSettings["batch_max_requests"];
    if (maxRequests && requests.length > maxRequests) {
      const chunks = partition(requests, maxRequests);
      return pMap(chunks, chunk => this._batchRequests(chunk, options));
    }
    const { responses } = await this.execute({
      ...reqOptions,
      path: endpoint("batch"),
      method: "POST",
      body: {
        defaults: { headers },
        requests: requests,
      },
    });
    return responses;
  }

  /**
   * Sends batch requests to the remote server.
   *
   * Note: Reserved for internal use only.
   *
   * @ignore
   * @param  {Function} fn                        The function to use for describing batch ops.
   * @param  {Object}   [options={}]              The options object.
   * @param  {Boolean}  [options.safe]            The safe option.
   * @param  {String}   [options.bucket]          The bucket name option.
   * @param  {String}   [options.collection]      The collection name option.
   * @param  {Object}   [options.headers]         The headers object option.
   * @param  {Boolean}  [options.aggregate=false] Produces an aggregated result object.
   * @return {Promise<Object, Error>}
   */
  @nobatch("Can't use batch within a batch!")
  async batch(fn, options = {}) {
    const rootBatch = new KintoClientBase(this.remote, {
      ...this._options,
      ...this._getRequestOptions(options),
      batch: true,
    });
    let bucketBatch, collBatch;
    if (options.bucket) {
      bucketBatch = rootBatch.bucket(options.bucket);
      if (options.collection) {
        collBatch = bucketBatch.collection(options.collection);
      }
    }
    const batchClient = collBatch || bucketBatch || rootBatch;
    fn(batchClient);
    const responses = await this._batchRequests(rootBatch._requests, options);
    if (options.aggregate) {
      return aggregate(responses, rootBatch._requests);
    } else {
      return responses;
    }
  }

  /**
   * Executes an atomic HTTP request.
   *
   * @private
   * @param  {Object}  request             The request object.
   * @param  {Object}  [options={}]        The options object.
   * @param  {Boolean} [options.raw=false] If true, resolve with full response
   * @param  {Boolean} [options.stringify=true] If true, serialize body data to
   * JSON.
   * @return {Promise<Object, Error>}
   */
  async execute(request, options = { raw: false, stringify: true }) {
    const { raw, stringify } = options;
    // If we're within a batch, add the request to the stack to send at once.
    if (this._isBatch) {
      this._requests.push(request);
      // Resolve with a message in case people attempt at consuming the result
      // from within a batch operation.
      const msg = "This result is generated from within a batch " +
        "operation and should not be consumed.";
      return raw ? { json: msg, headers: { get() {} } } : msg;
    }
    await this.fetchServerSettings();
    const result = await this.http.request(this.remote + request.path, {
      ...request,
      body: stringify ? JSON.stringify(request.body) : request.body,
    });
    return raw ? result : result.json;
  }

  async paginatedList(path, params, options = {}) {
    const { sort, filters, limit, pages, since } = {
      sort: "-last_modified",
      ...params,
    };
    // Safety/Consistency check on ETag value.
    if (since && typeof since !== "string") {
      throw new Error(
        `Invalid value for since (${since}), should be ETag value.`
      );
    }

    const querystring = qsify({
      ...filters,
      _sort: sort,
      _limit: limit,
      _since: since,
    });
    let results = [], current = 0;

    const next = async function(nextPage) {
      if (!nextPage) {
        throw new Error("Pagination exhausted.");
      }
      return processNextPage(nextPage);
    };

    const processNextPage = async function(nextPage) {
      const { headers } = options;
      return handleResponse(await this.http.request(nextPage, { headers }));
    }.bind(this);

    const pageResults = (results, nextPage, etag, totalRecords) => {
      // ETag string is supposed to be opaque and stored «as-is».
      // ETag header values are quoted (because of * and W/"foo").
      return {
        last_modified: etag ? etag.replace(/"/g, "") : etag,
        data: results,
        next: next.bind(null, nextPage),
        hasNextPage: !!nextPage,
        totalRecords,
      };
    };

    const handleResponse = async function({ headers, json }) {
      const nextPage = headers.get("Next-Page");
      const etag = headers.get("ETag");
      const totalRecords = parseInt(headers.get("Total-Records"), 10);

      if (!pages) {
        return pageResults(json.data, nextPage, etag, totalRecords);
      }
      // Aggregate new results with previous ones
      results = results.concat(json.data);
      current += 1;
      if (current >= pages || !nextPage) {
        // Pagination exhausted
        return pageResults(results, nextPage, etag, totalRecords);
      }
      // Follow next page
      return processNextPage(nextPage);
    };

    return handleResponse(
      await this.execute(
        { path: path + "?" + querystring, ...options },
        { raw: true }
      )
    );
  }

  /**
   * Lists all permissions.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Object[], Error>}
   */
  @capable(["permissions_endpoint"])
  async listPermissions(options = {}) {
    const path = endpoint("permissions");
    const reqOptions = this._getRequestOptions(options);
    // Ensure the default sort parameter is something that exists in permissions
    // entries, as `last_modified` doesn't; here, we pick "id".
    const paginationOptions = { sort: "id", ...options };
    return this.paginatedList(path, paginationOptions, reqOptions);
  }

  /**
   * Retrieves the list of buckets.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Object[], Error>}
   */
  async listBuckets(options = {}) {
    const path = endpoint("bucket");
    const reqOptions = this._getRequestOptions(options);
    return this.paginatedList(path, options, reqOptions);
  }

  /**
   * Creates a new bucket on the server.
   *
   * @param  {String|null}  id                The bucket name (optional).
   * @param  {Object}       [options={}]      The options object.
   * @param  {Boolean}      [options.data]    The bucket data option.
   * @param  {Boolean}      [options.safe]    The safe option.
   * @param  {Object}       [options.headers] The headers object option.
   * @return {Promise<Object, Error>}
   */
  async createBucket(id, options = {}) {
    const reqOptions = this._getRequestOptions(options);
    const { data = {}, permissions } = reqOptions;
    if (id != null) {
      data.id = id;
    }
    const path = data.id ? endpoint("bucket", data.id) : endpoint("bucket");
    return this.execute(
      requests.createRequest(path, { data, permissions }, reqOptions)
    );
  }

  /**
   * Deletes a bucket from the server.
   *
   * @ignore
   * @param  {Object|String} bucket                  The bucket to delete.
   * @param  {Object}        [options={}]            The options object.
   * @param  {Boolean}       [options.safe]          The safe option.
   * @param  {Object}        [options.headers]       The headers object option.
   * @param  {Number}        [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async deleteBucket(bucket, options = {}) {
    const bucketObj = toDataBody(bucket);
    if (!bucketObj.id) {
      throw new Error("A bucket id is required.");
    }
    const path = endpoint("bucket", bucketObj.id);
    const { last_modified } = { bucketObj };
    const reqOptions = this._getRequestOptions({ last_modified, ...options });
    return this.execute(requests.deleteRequest(path, reqOptions));
  }

  /**
   * Deletes all buckets on the server.
   *
   * @ignore
   * @param  {Object}  [options={}]            The options object.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  @support("1.4", "2.0")
  async deleteBuckets(options = {}) {
    const reqOptions = this._getRequestOptions(options);
    const path = endpoint("bucket");
    return this.execute(requests.deleteRequest(path, reqOptions));
  }
}
