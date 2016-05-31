import { toDataBody } from "./utils";
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
    /**
     * @ignore
     */
    this._isBatch = !!options.batch;
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
    return {
      ...this.options,
      ...options,
      headers,
      bucket: this.name,
      batch: this._isBatch
    };
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
  collection(name, options={}) {
    return new Collection(this.client, this, name, this._bucketOptions(options));
  }


  /**
   * Retrieves bucket data.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getData(options={}) {
    return this.client.execute({
      path: endpoint("bucket", this.name),
      headers: {...this.options.headers, ...options.headers}
    })
    .then((res) => res.data);
  }

  /**
   * Set bucket data.
   * @param  {Object}   data            The bucket data object.
   * @param  {Object}   options         The options object.
   * @param  {Object}   options.headers The headers object option.
   * @param  {Boolean}  options.safe    The safe option.
   * @param  {Boolean}  options.patch   The patch option.
   * @return {Promise<Object, Error>}
   */
  setData(data, options={}) {
    if (typeof data !== "object") {
      throw new Error("A bucket object is required.");
    }

    const bucket = {...data, id: this.name};

    // For default bucket, we need to drop the id from the data object.
    const bucketId = bucket.id;
    if (bucket.id === "default") {
      delete bucket.id;
    }

    const path = endpoint("bucket", bucketId);
    const { permissions } = options;
    const reqOptions = {...this._bucketOptions(options)};
    const request = requests.updateRequest(path, {data: bucket, permissions}, reqOptions);
    return this.client.execute(request);
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
    });
  }

  /**
   * Creates a new collection in current bucket.
   *
   * @param  {String|undefined}  id        The collection id.
   * @param  {Object}  options             The options object.
   * @param  {Boolean} options.safe        The safe option.
   * @param  {Object}  options.headers     The headers object option.
   * @param  {Object}  options.permissions The permissions object.
   * @param  {Object}  options.data        The data object.
   * @return {Promise<Object, Error>}
   */
  createCollection(id, options={}) {
    const reqOptions = this._bucketOptions(options);
    const { permissions, data={} } = reqOptions;
    data.id = id;
    const path = id ? endpoint("collection", this.name, id) :
                      endpoint("collections", this.name);
    const request = requests.createRequest(path, {data, permissions}, reqOptions);
    return this.client.execute(request);
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
  deleteCollection(collection, options={}) {
    const collectionObj = toDataBody(collection);
    if (!collectionObj.id) {
      throw new Error("A collection id is required.");
    }

    options = { last_modified: collectionObj.last_modified, ...options };
    const reqOptions = this._bucketOptions(options);
    const path = endpoint("collection", this.name, collectionObj.id);
    const request = requests.deleteRequest(path, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Retrieves the list of permissions for this bucket.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getPermissions(options={}) {
    return this.client.execute({
      path: endpoint("bucket", this.name),
      headers: {...this.options.headers, ...options.headers}
    })
    .then((res) => res.permissions);
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
    if (typeof permissions !== "object") {
      throw new Error("A permissions object is required.");
    }
    const path = endpoint("bucket", this.name);
    const reqOptions = {...this._bucketOptions(options)};
    const data = { last_modified: options.last_modified };
    const request = requests.updateRequest(path, {data, permissions}, reqOptions);
    return this.client.execute(request);
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
  batch(fn, options={}) {
    return this.client.batch(fn, this._bucketOptions(options));
  }
}
