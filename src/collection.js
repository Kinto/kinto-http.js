import { toDataBody, qsify } from "./utils";
import * as requests from "./requests";
import endpoint from "./endpoint";


/**
 * Abstract representation of a selected collection.
 *
 */
export default class Collection {
  /**
   * Constructor.
   *
   * @param  {KintoClient}  client          The client instance.
   * @param  {Bucket}       bucket          The bucket instance.
   * @param  {String}       name            The collection name.
   * @param  {Object}       options.headers The headers object option.
   * @param  {Boolean}      options.safe    The safe option.
   */
  constructor(client, bucket, name, options={}) {
    /**
     * @ignore
     */
    this.client = client;
    /**
     * @ignore
     */
    this.bucket = bucket;
    /**
     * The collection name.
     * @type {String}
     */
    this.name = name;

    /**
     * The default collection options object, embedding the default bucket ones.
     * @ignore
     * @type {Object}
     */
    this.options = {
      ...this.bucket.options,
      ...options,
      headers: {
        ...this.bucket.options && this.bucket.options.headers,
        ...options.headers
      }
    };
    /**
     * @ignore
     */
    this._isBatch = !!options.batch;
  }

  /**
   * Merges passed request options with default bucket and collection ones, if
   * any.
   *
   * @private
   * @param  {Object} options The options to merge.
   * @return {Object}         The merged options.
   */
  _collOptions(options={}) {
    const headers = {
      ...this.options && this.options.headers,
      ...options.headers
    };
    return {
      ...this.options,
      ...options,
      headers,
      // XXX soon to be removed once we've migrated everything from KintoClient
      bucket: this.bucket.name
    };
  }

  /**
   * Retrieves collection data.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getData(options={}) {
    const { headers } = this._collOptions(options);
    return this.client.execute({
      path: endpoint("collection", this.bucket.name, this.name),
      headers
    })
    .then(res => res.data);
  }

  /**
   * Set collection data.
   * @param  {Object}   data            The collection data object.
   * @param  {Object}   options         The options object.
   * @param  {Object}   options.headers The headers object option.
   * @param  {Boolean}  options.safe    The safe option.
   * @param  {Boolean}  options.patch   The patch option.
   * @return {Promise<Object, Error>}
   */
  setData(data, options={}) {
    return this.client.execute(requests.updateCollection({
      ...data,
      id: this.name,
    }, {...this._collOptions(options)}));
  }

  /**
   * Retrieves the list of permissions for this collection.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getPermissions(options={}) {
    const { headers } = this._collOptions(options);
    return this.client.execute({
      path: endpoint("collection", this.bucket.name, this.name),
      headers
    })
    .then(res => res.permissions);
  }

  /**
   * Replaces all existing collection permissions with the ones provided.
   *
   * @param  {Object}   permissions     The permissions object.
   * @param  {Object}   options         The options object
   * @param  {Object}   options.headers The headers object option.
   * @param  {Boolean}  options.safe    The safe option.
   * @param  {Number}   options.last_modified The last_modified option.
   * @return {Promise<Object, Error>}
   */
  setPermissions(permissions, options={}) {
    return this.client.execute(requests.updateCollection({
      id: this.name,
      last_modified: options.last_modified
    }, {...this._collOptions(options), permissions}));
  }

  /**
   * Creates a record in current collection.
   *
   * @param  {Object} record          The record to create.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  createRecord(record, options={}) {
    const reqOptions = this._collOptions(options);
    const request = requests.createRecord(this.name, record, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Updates a record in current collection.
   *
   * @param  {Object}  record                The record to update.
   * @param  {Object}  options               The options object.
   * @param  {Object}  options.headers       The headers object option.
   * @param  {Boolean} options.safe          The safe option.
   * @param  {Number}  options.last_modified The last_modified option.
   * @return {Promise<Object, Error>}
   */
  updateRecord(record, options={}) {
    const reqOptions = this._collOptions(options);
    const request = requests.updateRecord(this.name, record, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Deletes a record from the current collection.
   *
   * @param  {Object|String} record          The record to delete.
   * @param  {Object}        options         The options object.
   * @param  {Object}        options.headers The headers object option.
   * @param  {Boolean}       options.safe    The safe option.
   * @param  {Number}        options.last_modified The last_modified option.
   * @return {Promise<Object, Error>}
   */
  deleteRecord(record, options={}) {
    const reqOptions = this._collOptions(options);
    const request = requests.deleteRecord(this.name, toDataBody(record),
                                          reqOptions);
    return this.client.execute(request);
  }

  /**
   * Retrieves a record from the current collection.
   *
   * @param  {String} id              The record id to retrieve.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getRecord(id, options={}) {
    return this.client.execute({
      path: endpoint("record", this.bucket.name, this.name, id),
      ...this._collOptions(options),
    });
  }

  /**
   * Lists records from the current collection.
   *
   * Sorting is done by passing a `sort` string option:
   *
   * - The field to order the results by, prefixed with `-` for descending.
   * Default: `-last_modified`.
   *
   * @see http://kinto.readthedocs.io/en/stable/core/api/resource.html#sorting
   *
   * Filtering is done by passing a `filters` option object:
   *
   * - `{fieldname: "value"}`
   * - `{min_fieldname: 4000}`
   * - `{in_fieldname: "1,2,3"}`
   * - `{not_fieldname: 0}`
   * - `{exclude_fieldname: "0,1"}`
   *
   * @see http://kinto.readthedocs.io/en/stable/core/api/resource.html#filtering
   *
   * Paginating is done by passing a `limit` option, then calling the `next()`
   * method from the resolved result object to fetch the next page, if any.
   *
   * @param  {Object}   options         The options object.
   * @param  {Object}   options.headers The headers object option.
   * @param  {Object}   options.filters The filters object.
   * @param  {String}   options.sort    The sort field.
   * @param  {String}   options.limit   The limit field.
   * @param  {String}   options.pages   The number of result pages to aggregate.
   * @param  {Number}   options.since   Only retrieve records modified since the
   * provided timestamp.
   * @return {Promise<Object, Error>}
   */
  listRecords(options={}) {
    const { http } = this.client;
    const { sort, filters, limit, pages, since } = {
      sort: "-last_modified",
      ...options
    };
    // Safety/Consistency check on ETag value.
    if (since && typeof(since) !== "string") {
      throw new Error(`Invalid value for since (${since}), should be ETag value.`);
    }
    const collHeaders = this.options.headers;
    const path = endpoint("records", this.bucket.name, this.name);
    const querystring = qsify({
      ...filters,
      _sort: sort,
      _limit: limit,
      _since: since,
    });
    let results = [], current = 0;

    const next = function(nextPage) {
      if (!nextPage) {
        throw new Error("Pagination exhausted.");
      }
      return processNextPage(nextPage);
    };

    const processNextPage = (nextPage) => {
      return http.request(nextPage, {headers: collHeaders})
        .then(handleResponse);
    };

    const pageResults = (results, nextPage, etag) => {
      return {
        last_modified: etag,
        data: results,
        next: next.bind(null, nextPage)
      };
    };

    const handleResponse = ({headers, json}) => {
      const nextPage = headers.get("Next-Page");
      // ETag are supposed to be opaque and stored «as-is».
      const etag = headers.get("ETag");
      if (!pages) {
        return pageResults(json.data, nextPage, etag);
      }
      // Aggregate new results with previous ones
      results = results.concat(json.data);
      current += 1;
      if (current >= pages || !nextPage) {
        // Pagination exhausted
        return pageResults(results, nextPage, etag);
      }
      // Follow next page
      return processNextPage(nextPage);
    };

    return this.client.execute({
      path: path + "?" + querystring,
      ...this._collOptions(options),
    }, {raw: true}).then(handleResponse);
  }

  /**
   * Performs batch operations at the current collection level.
   *
   * @param  {Function} fn                 The batch operation function.
   * @param  {Object}   options            The options object.
   * @param  {Object}   options.headers    The headers object option.
   * @param  {Boolean}  options.safe       The safe option.
   * @param  {Boolean}  options.aggregate  Produces a grouped result object.
   * @return {Promise<Object, Error>}
   */
  batch(fn, options={}) {
    const reqOptions = this._collOptions(options);
    return this.client.batch(fn, {
      ...reqOptions,
      collection: this.name,
    });
  }
}
