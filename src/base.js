"use strict";

import {
  getOptionWithDefault,
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
      retry: options.retry || 0,
    };

    this._options = options;
    this._requests = [];
    this._isBatch = !!options.batch;
    this._safe = !!options.safe;
    this._headers = options.headers || {};

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
    return new Bucket(this, name, {
      ...bucketOptions,
      headers: this._getHeaders(options),
      safe: this._getSafe(options),
    });
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
    };
  }

  /**
   * Get the value of "headers" for a given request, merging the
   * per-request headers with our own "default" headers.
   *
   * Note that unlike other options, headers aren't overridden, but
   * merged instead.
   *
   * @private
   * @param {Object} options The options for a request.
   * @returns {Object}
   */
  _getHeaders(options) {
    return {
      ...this._headers,
      ...options.headers,
    };
  }

  /**
   * Get the value of "safe" for a given request, using the
   * per-request option if present or falling back to our default
   * otherwise.
   *
   * @private
   * @param {Object} options The options for a request.
   * @returns {Boolean}
   */
  _getSafe(options) {
    return getOptionWithDefault(options, "safe", this._safe);
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
    const { json } = await this.http.request(path, {
      ...reqOptions,
      headers: this._getHeaders(options),
    });
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
    const headers = this._getHeaders(options);
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
   * @param  {Number}   [options.retry]           The retry option.
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
      safe: this._getSafe(options),
      // FIXME: this doesn't actually matter, probably, since it gets
      // passed as "default headers" in the batch?
      headers: this._getHeaders(options),
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
   * @param  {String}  request.path        The path to fetch, relative
   *     to the Kinto server root.
   * @param  {String}  [request.method="GET"] The method to use in the
   *     request.
   * @param  {Body}    [request.body]      The request body.
   * @param  {Object}  [request.headers={}] The request headers.
   * @param  {Number}  [request.retry=0]   The number of times to
   *     retry a request if the server responds with Retry-After.
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
    // FIXME: Because any fetch() option is accepted here, `request`
    // could have lots of parameters that wouldn't be accepted as part
    // of a batch request. This makes it easier to shoot yourself in
    // the foot. We should probably only pass through the four
    // parameters accepted in a batch request: method, body, path, and
    // headers.
    const result = await this.http.request(this.remote + request.path, {
      ...request,
      body: stringify ? JSON.stringify(request.body) : request.body,
    });
    return raw ? result : result.json;
  }

  /**
   * Fetch some pages from a paginated list, following the `next-page`
   * header automatically until we have fetched the requested number
   * of pages. Return a response with a `.next()` method that can be
   * called to fetch more results.
   *
   * @private
   * @param  {String}  path
   *     The path to make the request to.
   * @param  {Object}  params
   *     The parameters to use when making the request.
   * @param  {String}  [params.sort="-last_modified"]
   *     The sorting order to use when fetching.
   * @param  {Object}  [params.filters={}]
   *     The filters to send in the request.
   * @param  {Number}  [params.limit=undefined]
   *     The limit to send in the request. Undefined means no limit.
   * @param  {Number}  [params.pages=undefined]
   *     The number of pages to fetch. Undefined means one page. Pass
   *     Infinity to fetch everything.
   * @param  {String}  [params.since=undefined]
   *     The ETag from which to start fetching.
   * @param  {Object}  [options={}]
   *     Additional request-level parameters to use in all requests.
   * @param  {Object}  [options.headers={}]
   *     Headers to use during all requests.
   * @param  {Number}  [options.retry=0]
   *     Number of times to retry each request if the server responds
   *     with Retry-After.
   */
  async paginatedList(path, params, options = {}) {
    // FIXME: this is called even in batch requests, which doesn't
    // make any sense (since all batch requests get a "dummy"
    // response; see execute() above).
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
        // FIXME: path should override options, and we should probably
        // not respect options.method or options.body
        // N.B.: This doesn't use _getHeaders, because all calls to
        // `paginatedList` are assumed to come from calls that already
        // have headers merged at e.g. the bucket or collection level.
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
    const reqOptions = {
      ...this._getRequestOptions(options),
      headers: this._getHeaders(options),
    };
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
    return this.paginatedList(path, options, {
      ...reqOptions,
      headers: this._getHeaders(options),
    });
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
    const { data = {}, permissions } = options;
    if (id != null) {
      data.id = id;
    }
    const path = data.id ? endpoint("bucket", data.id) : endpoint("bucket");
    return this.execute(
      requests.createRequest(
        path,
        { data, permissions },
        {
          ...reqOptions,
          headers: this._getHeaders(options),
          safe: this._getSafe(options),
        }
      )
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
    return this.execute(
      requests.deleteRequest(path, {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      })
    );
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
    return this.execute(
      requests.deleteRequest(path, {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      })
    );
  }
}
