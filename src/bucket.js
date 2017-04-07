import { getOptionWithDefault, toDataBody, isObject, capable } from "./utils";
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
   * @param  {KintoClient} client            The client instance.
   * @param  {String}      name              The bucket name.
   * @param  {Object}      [options={}]      The headers object option.
   * @param  {Object}      [options.headers] The headers object option.
   * @param  {Boolean}     [options.safe]    The safe option.
   * @param  {Number}      [options.retry]   The retry option.
   */
  constructor(client, name, options = {}) {
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
    /**
     * @ignore
     */
    this._headers = options.headers || {};
    this._retry = options.retry || 0;
    this._safe = !!options.safe;
  }

  /**
   * Merges passed request options with default bucket ones, if any.
   *
   * @private
   * @param  {Object} [options={}] The options to merge.
   * @return {Object}              The merged options.
   */
  _bucketOptions(options = {}) {
    return {
      ...this.options,
      ...options,
    };
  }

  /**
   * Get the value of "headers" for a given request, merging the
   * per-request headers with our own "default" headers.
   *
   * @private
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
   * @param {Object} options The options for a request.
   * @returns {Boolean}
   */
  _getSafe(options) {
    return getOptionWithDefault(options, "safe", this._safe);
  }

  /**
   * As _getSafe, but for "retry".
   */
  _getRetry(options) {
    return getOptionWithDefault(options, "retry", this._retry);
  }

  /**
   * Selects a collection.
   *
   * @param  {String}  name              The collection name.
   * @param  {Object}  [options={}]      The options object.
   * @param  {Object}  [options.headers] The headers object option.
   * @param  {Boolean} [options.safe]    The safe option.
   * @return {Collection}
   */
  collection(name, options = {}) {
    return new Collection(this.client, this, name, {
      ...this._bucketOptions(options),
      batch: this._isBatch,
      headers: this._getHeaders(options),
      retry: this._getRetry(options),
      safe: this._getSafe(options),
    });
  }

  /**
   * Retrieves bucket data.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Object, Error>}
   */
  async getData(options = {}) {
    const reqOptions = { ...this._bucketOptions(options) };
    const request = {
      ...reqOptions,
      headers: this._getHeaders(options),
      path: endpoint("bucket", this.name),
    };
    const { data } = await this.client.execute(request, {
      retry: this._getRetry(options),
    });
    return data;
  }

  /**
   * Set bucket data.
   * @param  {Object}  data                    The bucket data object.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Boolean} [options.patch]         The patch option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async setData(data, options = {}) {
    if (!isObject(data)) {
      throw new Error("A bucket object is required.");
    }

    const bucket = { ...data, id: this.name };

    // For default bucket, we need to drop the id from the data object.
    // Bug in Kinto < 3.1.1
    const bucketId = bucket.id;
    if (bucket.id === "default") {
      delete bucket.id;
    }

    const path = endpoint("bucket", bucketId);
    const { permissions } = options;
    const reqOptions = { ...this._bucketOptions(options) };
    const request = requests.updateRequest(
      path,
      { data: bucket, permissions },
      {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Retrieves the list of history entries in the current bucket.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Array<Object>, Error>}
   */
  @capable(["history"])
  async listHistory(options = {}) {
    const path = endpoint("history", this.name);
    const reqOptions = this._bucketOptions(options);
    return this.client.paginatedList(path, options, {
      ...reqOptions,
      headers: this._getHeaders(options),
      retry: this._getRetry(options),
    });
  }

  /**
   * Retrieves the list of collections in the current bucket.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Array<Object>, Error>}
   */
  async listCollections(options = {}) {
    const path = endpoint("collection", this.name);
    const reqOptions = this._bucketOptions(options);
    return this.client.paginatedList(path, options, {
      ...reqOptions,
      headers: this._getHeaders(options),
      retry: this._getRetry(options),
    });
  }

  /**
   * Creates a new collection in current bucket.
   *
   * @param  {String|undefined}  id          The collection id.
   * @param  {Object}  [options={}]          The options object.
   * @param  {Boolean} [options.safe]        The safe option.
   * @param  {Object}  [options.headers]     The headers object option.
   * @param  {Object}  [options.permissions] The permissions object.
   * @param  {Object}  [options.data]        The data object.
   * @return {Promise<Object, Error>}
   */
  async createCollection(id, options = {}) {
    const reqOptions = this._bucketOptions(options);
    const { permissions, data = {} } = options;
    data.id = id;
    const path = endpoint("collection", this.name, id);
    const request = requests.createRequest(
      path,
      { data, permissions },
      {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Deletes a collection from the current bucket.
   *
   * @param  {Object|String} collection              The collection to delete.
   * @param  {Object}        [options={}]            The options object.
   * @param  {Object}        [options.headers]       The headers object option.
   * @param  {Boolean}       [options.safe]          The safe option.
   * @param  {Number}        [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async deleteCollection(collection, options = {}) {
    const collectionObj = toDataBody(collection);
    if (!collectionObj.id) {
      throw new Error("A collection id is required.");
    }
    const { id, last_modified } = collectionObj;
    const reqOptions = this._bucketOptions({ last_modified, ...options });
    const path = endpoint("collection", this.name, id);
    const request = requests.deleteRequest(path, {
      ...reqOptions,
      headers: this._getHeaders(options),
      safe: this._getSafe(options),
    });
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Retrieves the list of groups in the current bucket.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Array<Object>, Error>}
   */
  async listGroups(options = {}) {
    const path = endpoint("group", this.name);
    const reqOptions = this._bucketOptions(options);
    return this.client.paginatedList(path, options, {
      ...reqOptions,
      headers: this._getHeaders(options),
      retry: this._getRetry(options),
    });
  }

  /**
   * Creates a new group in current bucket.
   *
   * @param  {String} id                The group id.
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Object, Error>}
   */
  async getGroup(id, options = {}) {
    const reqOptions = { ...this._bucketOptions(options) };
    const request = {
      ...reqOptions,
      headers: this._getHeaders(options),
      path: endpoint("group", this.name, id),
    };
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Creates a new group in current bucket.
   *
   * @param  {String|undefined}  id                    The group id.
   * @param  {Array<String>}     [members=[]]          The list of principals.
   * @param  {Object}            [options={}]          The options object.
   * @param  {Object}            [options.data]        The data object.
   * @param  {Object}            [options.permissions] The permissions object.
   * @param  {Boolean}           [options.safe]        The safe option.
   * @param  {Object}            [options.headers]     The headers object option.
   * @return {Promise<Object, Error>}
   */
  async createGroup(id, members = [], options = {}) {
    const reqOptions = this._bucketOptions(options);
    const data = {
      ...options.data,
      id,
      members,
    };
    const path = endpoint("group", this.name, id);
    const { permissions } = options;
    const request = requests.createRequest(
      path,
      { data, permissions },
      {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Updates an existing group in current bucket.
   *
   * @param  {Object}  group                   The group object.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.data]          The data object.
   * @param  {Object}  [options.permissions]   The permissions object.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async updateGroup(group, options = {}) {
    if (!isObject(group)) {
      throw new Error("A group object is required.");
    }
    if (!group.id) {
      throw new Error("A group id is required.");
    }
    const reqOptions = this._bucketOptions(options);
    const data = {
      ...options.data,
      ...group,
    };
    const path = endpoint("group", this.name, group.id);
    const { permissions } = options;
    const request = requests.updateRequest(
      path,
      { data, permissions },
      {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Deletes a group from the current bucket.
   *
   * @param  {Object|String} group                   The group to delete.
   * @param  {Object}        [options={}]            The options object.
   * @param  {Object}        [options.headers]       The headers object option.
   * @param  {Boolean}       [options.safe]          The safe option.
   * @param  {Number}        [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async deleteGroup(group, options = {}) {
    const groupObj = toDataBody(group);
    const { id, last_modified } = groupObj;
    const reqOptions = this._bucketOptions({ last_modified, ...options });
    const path = endpoint("group", this.name, id);
    const request = requests.deleteRequest(path, {
      ...reqOptions,
      headers: this._getHeaders(options),
      safe: this._getSafe(options),
    });
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Retrieves the list of permissions for this bucket.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @return {Promise<Object, Error>}
   */
  async getPermissions(options = {}) {
    const reqOptions = this._bucketOptions(options);
    const request = {
      ...reqOptions,
      headers: this._getHeaders(options),
      path: endpoint("bucket", this.name),
    };
    const { permissions } = await this.client.execute(request, {
      retry: this._getRetry(options),
    });
    return permissions;
  }

  /**
   * Replaces all existing bucket permissions with the ones provided.
   *
   * @param  {Object}  permissions             The permissions object.
   * @param  {Object}  [options={}]            The options object
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Object}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async setPermissions(permissions, options = {}) {
    if (!isObject(permissions)) {
      throw new Error("A permissions object is required.");
    }
    const path = endpoint("bucket", this.name);
    const reqOptions = this._bucketOptions(options);
    const { last_modified } = options;
    const data = { last_modified };
    const request = requests.updateRequest(
      path,
      { data, permissions },
      {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Append principals to the bucket permissions.
   *
   * @param  {Object}  permissions             The permissions object.
   * @param  {Object}  [options={}]            The options object
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Object}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async addPermissions(permissions, options = {}) {
    if (!isObject(permissions)) {
      throw new Error("A permissions object is required.");
    }
    const path = endpoint("bucket", this.name);
    const { last_modified } = options;
    const reqOptions = { last_modified, ...this._bucketOptions(options) };
    const request = requests.jsonPatchPermissionsRequest(
      path,
      permissions,
      "add",
      {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Remove principals from the bucket permissions.
   *
   * @param  {Object}  permissions             The permissions object.
   * @param  {Object}  [options={}]            The options object
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Object}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async removePermissions(permissions, options = {}) {
    if (!isObject(permissions)) {
      throw new Error("A permissions object is required.");
    }
    const path = endpoint("bucket", this.name);
    const { last_modified } = options;
    const reqOptions = { last_modified, ...this._bucketOptions(options) };
    const request = requests.jsonPatchPermissionsRequest(
      path,
      permissions,
      "remove",
      {
        ...reqOptions,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Performs batch operations at the current bucket level.
   *
   * @param  {Function} fn                   The batch operation function.
   * @param  {Object}   [options={}]         The options object.
   * @param  {Object}   [options.headers]    The headers object option.
   * @param  {Boolean}  [options.safe]       The safe option.
   * @param  {Number}   [options.retry]      The retry option.
   * @param  {Boolean}  [options.aggregate]  Produces a grouped result object.
   * @return {Promise<Object, Error>}
   */
  async batch(fn, options = {}) {
    return this.client.batch(fn, {
      ...this._bucketOptions(options),
      bucket: this.name,
      headers: this._getHeaders(options),
      retry: this._getRetry(options),
      safe: this._getSafe(options),
    });
  }
}
