import { toDataBody } from "./utils";
import Collection from "./collection";
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
  getAttributes(options={}) {
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
      .then(res => res.json);
  }

  /**
   * Creates a new collection in current bucket.
   *
   * @param  {String|undefined}  id        The collection id.
   * @param  {Object}  options             The options object.
   * @param  {Boolean} options.safe        The safe option.
   * @param  {Object}  options.headers     The headers object option.
   * @param  {Object}  options.permissions The permissions object.
   * @param  {Object}  options.data        The metadadata object.
   * @param  {Object}  options.schema      The JSONSchema object.
   * @return {Promise<Object, Error>}
   */
  createCollection(id, options) {
    const reqOptions = this._bucketOptions(options);
    const request = this.client.requests.createCollection(id, reqOptions);
    return this.client.execute(request).then(res => res.json);
  }

  /**
   * Deletes a collection from the current bucket.
   *
   * @param  {Object|String} collection  The collection to delete.
   * @param  {Object}    options         The options object.
   * @param  {Object}    options.headers The headers object option.
   * @param  {Boolean}   options.safe    The safe option.
   * @return {Promise<Object, Error>}
   */
  deleteCollection(collection, options) {
    const reqOptions = this._bucketOptions(options);
    const request = this.client.requests.deleteCollection(
      toDataBody(collection),
      reqOptions
    );
    return this.client.execute(request).then(res => res.json);
  }

  /**
   * Retrieves the list of permissions for this bucket.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getPermissions(options) {
    return this.getAttributes(this._bucketOptions(options))
      .then(res => res.permissions);
  }

  /**
   * Recplaces all existing bucket permissions with the ones provided.
   *
   * @param  {Object}  permissions           The permissions object.
   * @param  {Object}  options               The options object
   * @param  {Object}  options               The options object.
   * @param  {Boolean} options.safe          The safe option.
   * @param  {Object}  options.headers       The headers object option.
   * @param  {Object}  options.last_modified The last_modified option.
   * @return {Promise<Object, Error>}
   */
  setPermissions(permissions, options={}) {
    return this.client.execute(this.client.requests.updateBucket({
      id: this.name,
      last_modified: options.last_modified
    }, {...this._bucketOptions(options), permissions}))
      .then(res => res.json);
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
