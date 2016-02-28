import { toDataObj } from "./utils";
import Collection from "./collection";
import * as requests from "./requests";
import endpoint from "./endpoint";


/**
 * Abstract representation of a selected bucket.
 *
 */
export default class Bucket {
  /**
   * Constructor.
   *
   * @param  {KintoClient} client          The client instance.
   * @param  {String}      name            The bucket name.
   * @param  {Object}      options.headers The headers object option.
   * @param  {Boolean}     options.safe    The safe option.
   */
  constructor(client, name, options={}) {
    /**
     * @ignore
     */
    this.client = client;
    /**
     * The bucket name.
     * @type {String}
     */
    this.name = name;
    /**
     * The default options object.
     * @ignore
     * @type {Object}
     */
    this.options = options;
  }

  /**
   * Merges passed request options with default bucket ones, if any.
   *
   * @private
   * @param  {Object} options The options to merge.
   * @return {Object}         The merged options.
   */
  _bucketOptions(options={}) {
    const headers = {
      ...this.options && this.options.headers,
      ...options.headers
    };
    return {...this.options, ...options, headers, bucket: this.name};
  }

  /**
   * Selects a collection.
   *
   * @param  {String} name            The collection name.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Collection}
   */
  collection(name, options) {
    return new Collection(this.client, this, name, this._bucketOptions(options));
  }


  /**
   * Retrieves bucket properties.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getProperties(options={}) {
    return this.client.execute({
      path: endpoint("bucket", this.name),
      headers: {...this.options.headers, ...options.headers}
    })
      .then(res => res.json);
  }

  /**
   * Retrieves the list of collections in the current bucket.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Array<Object>, Error>}
   */
  listCollections(options={}) {
    return this.client.execute({
      path: endpoint("collections", this.name),
      headers: {...this.options.headers, ...options.headers}
    })
      .then(res => res.json && res.json.data);
  }

  /**
   * Creates a new collection in current bucket.
   *
   * @param  {String}   id              The collection id.
   * @param  {Object}   options         The options object.
   * @param  {Object}   options.headers The headers object option.
   * @param  {Boolean}  options.safe    The safe option.
   * @return {Promise<Object, Error>}
   */
  createCollection(id, options) {
    const reqOptions = this._bucketOptions(options);
    return this.client.execute(requests.createCollection(id, reqOptions))
      .then(res => res.json);
  }

  /**
   * Deletes a collection from the current bucket.
   *
   * @param  {Object|String} collection The collection to delete.
   * @param  {Object} options           The options object.
   * @param  {Object} options.headers   The headers object option.
   * @param  {Boolean}  options.safe    The safe option.
   * @return {Promise<Object, Error>}
   */
  deleteCollection(collection, options) {
    const reqOptions = this._bucketOptions(options);
    return this.client.deleteCollection(toDataObj(collection), reqOptions);
  }

  /**
   * Retrieves the list of permissions for this bucket.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getPermissions(options) {
    return this.getProperties(this._bucketOptions(options))
      .then(res => res.permissions);
  }

  /**
   * Recplaces all existing bucket permissions with the ones provided.
   *
   * @param  {Object} permissions     The permissions object.
   * @param  {Object} options         The options object
   * @param  {Object} options.headers The headers object option.
   * @param  {Object} options.last_modified The last_modified option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  setPermissions(permissions, options) {
    const reqOptions = this._bucketOptions(options);
    return this.client.updateBucket({
      id: this.name,
      last_modified: options && options.last_modified
    }, {...reqOptions, permissions});
  }

  /**
   * Performs batch operations at the current bucket level.
   *
   * @param  {Function} fn                 The batch operation function.
   * @param  {Object}   options            The options object.
   * @param  {Object}   options.headers    The headers object option.
   * @param  {Boolean}  options.safe       The safe option.
   * @param  {Boolean}  options.aggregate  Produces a grouped result object.
   * @return {Promise<Object, Error>}
   */
  batch(fn, options) {
    return this.client.batch(fn, this._bucketOptions(options));
  }
}
