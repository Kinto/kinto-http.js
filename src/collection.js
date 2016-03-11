import { omit, toDataBody, qsify } from "./utils";
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
   * Updates current collection properties.
   *
   * @private
   * @param  {Object} options  The request options.
   * @return {Promise<Object, Error>}
   */
  _updateAttributes(options={}) {
    const collection = toDataBody(this.name);
    const reqOptions = this._collOptions(options);
    const request = this.client.requests.updateCollection(
      collection,
      reqOptions
    );
    return this.client.execute(request).then(res => res.json);
  }

  /**
   * Retrieves collection properties.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getAttributes(options) {
    const { headers } = this._collOptions(options);
    return this.client.execute({
      path: endpoint("collection", this.bucket.name, this.name),
      headers
    }).then(res => res.json);
  }

  /**
   * Retrieves the list of permissions for this collection.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getPermissions(options) {
    return this.getAttributes(options)
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
  setPermissions(permissions, options) {
    return this._updateAttributes({...options, permissions});
  }

  /**
   * Retrieves the JSON schema for this collection, if any.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object|null, Error>}
   */
  getSchema(options) {
    return this.getAttributes(options)
      .then(res => res.data && res.data.schema || null);
  }

  /**
   * Sets the JSON schema for this collection.
   *
   * @param  {Object}   schema          The JSON schema object.
   * @param  {Object}   options         The options object.
   * @param  {Object}   options.headers The headers object option.
   * @param  {Boolean}  options.safe    The safe option.
   * @param  {Number}   options.last_modified The last_modified option.
   * @return {Promise<Object|null, Error>}
   */
  setSchema(schema, options) {
    return this._updateAttributes({...options, schema});
  }

  /**
   * Retrieves metadata attached to current collection.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getMetadata(options) {
    return this.getAttributes(options)
      .then(({data}) => omit(data, "schema"));
  }

  /**
   * Sets metadata for current collection.
   *
   * @param  {Object}   metadata        The metadata object.
   * @param  {Object}   options         The options object.
   * @param  {Object}   options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @param  {Number}   options.last_modified The last_modified option.
   * @return {Promise<Object, Error>}
   */
  setMetadata(metadata, options) {
    // Note: patching allows preventing overridding the schema, which lives
    // within the "data" namespace.
    return this._updateAttributes({...options, metadata, patch: true});
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
  createRecord(record, options) {
    const reqOptions = this._collOptions(options);
    const request = this.client.requests.createRecord(
      this.name,
      record,
      reqOptions
    );
    return this.client.execute(request).then(res => res.json);
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
  updateRecord(record, options) {
    const reqOptions = this._collOptions(options);
    const request = this.client.requests.updateRecord(
      this.name,
      record,
      reqOptions
    );
    return this.client.execute(request).then(res => res.json);
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
  deleteRecord(record, options) {
    const reqOptions = this._collOptions(options);
    const request = this.client.requests.deleteRecord(
      this.name,
      toDataBody(record),
      reqOptions
    );
    return this.client.execute(request).then(res => res.json);
  }

  /**
   * Retrieves a record from the current collection.
   *
   * @param  {String} id              The record id to retrieve.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getRecord(id, options) {
    return this.client.execute({
      path: endpoint("record", this.bucket.name, this.name, id),
      ...this._collOptions(options),
    }).then(res => res.json);
  }

  /**
   * Lists records from the current collection.
   *
   * Sorting is done by passing a `sort` string option:
   *
   * - The field to order the results by, prefixed with `-` for descending.
   * Default: `-last_modified`.
   *
   * @see http://kinto.readthedocs.org/en/latest/api/1.x/cliquet/resource.html#sorting
   *
   * Filtering is done by passing a `filters` option object:
   *
   * - `{fieldname: "value"}`
   * - `{min_fieldname: 4000}`
   * - `{in_fieldname: "1,2,3"}`
   * - `{not_fieldname: 0}`
   * - `{exclude_fieldname: "0,1"}`
   *
   * @see http://kinto.readthedocs.org/en/latest/api/1.x/cliquet/resource.html#filtering
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
    }).then(handleResponse);
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
  batch(fn, options) {
    const reqOptions = this._collOptions(options);
    return this.client.batch(fn, {
      ...reqOptions,
      collection: this.name,
    });
  }
}
