/**
 * Abstract representation of a selected bucket.
 *
 */
export class Bucket {
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
  getProperties(options) {
    return this.client.getBucket(this.name, options);
  }

  /**
   * Retrieves the list of collections in the current bucket.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Array<Object>, Error>}
   */
  listCollections(options) {
    return this.client.listCollections(this.name, this._bucketOptions(options));
  }

  /**
   * Creates a new collection in current bucket.
   *
   * @param  {Object} collection               The collection object to create.
   * @param  {Object} collection.id            The collection id.
   * @param  {Object} collection.last_modified The collection last_modified.
   * @param  {Object} options                  The options object.
   * @param  {Object} options.headers          The headers object option.
   * @param  {Boolean}  options.safe           The safe option.
   * @return {Promise<Object, Error>}
   */
  createCollection(collection={}, options) {
    const reqOptions = this._bucketOptions(options);
    return this.client.createCollection(collection, reqOptions);
  }

  /**
   * Deletes a collection from the current bucket.
   *
   * @param  {String} id              The collection id.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  deleteCollection(id, options) {
    return this.client.deleteCollection(id, this._bucketOptions(options));
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
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  setPermissions(permissions, options) {
    const reqOptions = this._bucketOptions({...options, permissions});
    return this.client.updateBucket(this.name, {}, reqOptions);
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

/**
 * Abstract representation of a selected collection.
 *
 */
export class Collection {
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
    this.options = options;
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
      ...this.bucket.options && this.bucket.options.headers,
      ...this.options && this.options.headers,
      ...options.headers
    };
    return {
      ...this.bucket.options,
      ...this.options,
      ...options,
      headers,
      bucket: this.bucket.name
    };
  }

  /**
   * Retrieves collection properties.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Object, Error>}
   */
  getProperties(options) {
    const reqOptions = this._collOptions(options);
    return this.client.getCollection(this.name, reqOptions);
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
   * @param {Object} permissions      The permissions object.
   * @param {Object} options          The options object
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  setPermissions(permissions, options) {
    const reqOptions = this._collOptions(options);
    return this.client.updateCollection({id: this.name}, {
      ...reqOptions,
      permissions,
    });
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
   * @param  {Object} schema          The JSON schema object.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object|null, Error>}
   */
  setSchema(schema, options) {
    const reqOptions = this._collOptions(options);
    return this.client.updateCollection({id: this.name}, {
      ...reqOptions,
      schema,
    });
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
      .then(res => {
        // XXX move this to utils
        return Object.keys(res.data).reduce((acc, key) => {
          if (key !== "schema") {
            acc[key] = res.data[key];
          }
          return acc;
        }, {});
      });
  }

  /**
   * Sets metadata for current collection.
   *
   * @param  {Object} metadata        The metadata object.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  setMetadata(metadata, options) {
    const reqOptions = this._collOptions(options);
    return this.client.updateCollection({...metadata, id: this.name}, {
      ...reqOptions,
      patch: true,
    });
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
    return this.client.createRecord(this.name, record, reqOptions);
  }

  /**
   * Updates a record in current collection.
   *
   * @param  {Object} record          The record to update.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  updateRecord(record, options) {
    const reqOptions = this._collOptions(options);
    return this.client.updateRecord(this.name, record, reqOptions);
  }

  /**
   * Deletes a record from the current collection.
   *
   * @param  {String} id              The record id to delete.
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @param  {Boolean}  options.safe  The safe option.
   * @return {Promise<Object, Error>}
   */
  deleteRecord(id, options) {
    const reqOptions = this._collOptions(options);
    return this.client.deleteRecord(this.name, id, reqOptions);
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
    const reqOptions = this._collOptions(options);
    return this.client.getRecord(this.name, id, reqOptions);
  }

  /**
   * Lists records from the current collection.
   *
   * @param  {Object} options         The options object.
   * @param  {Object} options.headers The headers object option.
   * @return {Promise<Array<Object>, Error>}
   */
  listRecords(options) {
    const reqOptions = this._collOptions(options);
    return this.client.listRecords(this.name, reqOptions)
      .then(res => res.data);
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
