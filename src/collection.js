import { omit, toDataObj } from "./utils";
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
  _updateProperties(options={}) {
    const collection = toDataObj(this.name);
    const reqOptions = this._collOptions(options);
    const request = requests.updateCollection(collection, reqOptions);
    return this.client.execute(request).then(res => res.json);
  }

  /**
   * Retrieves collection properties.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getProperties(options) {
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
    return this.getProperties(options)
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
    return this._updateProperties({...options, permissions});
  }

  /**
   * Retrieves the JSON schema for this collection, if any.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object|null, Error>}
   */
  getSchema(options) {
    return this.getProperties(options)
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
    return this._updateProperties({...options, schema});
  }

  /**
   * Retrieves metadata attached to current collection.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getMetadata(options) {
    return this.getProperties(options)
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
    return this._updateProperties({...options, metadata, patch: true});
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
    const request = requests.createRecord(this.name, record, reqOptions);
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
    const request = requests.updateRecord(this.name, record, reqOptions);
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
    const request = requests.deleteRecord(this.name, toDataObj(record),
                                          reqOptions);
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
   * @param  {Object}   options         The options object.
   * @param  {Object}   options.headers The headers object option.
   * @param  {String}   options.sort    The sort field, prefixed with `-` for
   * descending. Default: `-last_modified`.
   * @return {Promise<Array<Object>, Error>}
   */
  listRecords(options={}) {
    const { sort } = {
      sort: "-last_modified",
      ...options
    };
    const path = endpoint("records", this.bucket.name, this.name);
    // XXX When we'll add support for more qs parameters, we should use node's
    // url/querystring modules instead.
    const querystring = `?_sort=${sort}`;
    return this.client.execute({
      path: path + querystring,
      ...this._collOptions(options),
    }).then(res => res.json && res.json.data);
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
