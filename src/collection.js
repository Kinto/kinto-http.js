import { v4 as uuid } from "uuid";

import { capable, toDataBody, isObject, qsify } from "./utils";
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
   * @param  {KintoClient}  client            The client instance.
   * @param  {Bucket}       bucket            The bucket instance.
   * @param  {String}       name              The collection name.
   * @param  {Object}       [options={}]      The options object.
   * @param  {Object}       [options.headers] The headers object option.
   * @param  {Boolean}      [options.safe]    The safe option.
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
   * @param  {Object} [options={}] The options to merge.
   * @return {Object}              The merged options.
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
    };
  }

  /**
   * Retrieves the total number of records in this collection.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @param  {String} [options.since]   The since ETag option.
   * @return {Promise<Number, Error>}
   */
  getTotalRecords(options={}) {
    const { since, ...otherOptions } = options;
    const { headers } = this._collOptions(otherOptions);
    let path = endpoint("record", this.bucket.name, this.name);
    if (since) {
      path += "?" + qsify({since});
    }
    return this.client.execute({
      method: "HEAD",
      path,
      headers
    }, {raw: true})
      .then(({headers}) => parseInt(headers.get("Total-Records"), 10));
  }

  /**
   * Retrieves collection data.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
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
   * @param  {Object}   data                    The collection data object.
   * @param  {Object}   [options={}]            The options object.
   * @param  {Object}   [options.headers]       The headers object option.
   * @param  {Boolean}  [options.safe]          The safe option.
   * @param  {Boolean}  [options.patch]         The patch option.
   * @param  {Number}   [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  setData(data, options={}) {
    if (!isObject(data)) {
      throw new Error("A collection object is required.");
    }
    const reqOptions = this._collOptions(options);
    const { permissions } = reqOptions;

    const path = endpoint("collection", this.bucket.name, this.name);
    const request = requests.updateRequest(path, {data, permissions}, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Retrieves the list of permissions for this collection.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
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
   * @param  {Object}   permissions             The permissions object.
   * @param  {Object}   [options={}]            The options object
   * @param  {Object}   [options.headers]       The headers object option.
   * @param  {Boolean}  [options.safe]          The safe option.
   * @param  {Number}   [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  setPermissions(permissions, options={}) {
    if (!isObject(permissions)) {
      throw new Error("A permissions object is required.");
    }
    const reqOptions = this._collOptions(options);
    const path = endpoint("collection", this.bucket.name, this.name);
    const data = { last_modified: options.last_modified };
    const request = requests.updateRequest(path, {data, permissions}, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Creates a record in current collection.
   *
   * @param  {Object}  record                The record to create.
   * @param  {Object}  [options={}]          The options object.
   * @param  {Object}  [options.headers]     The headers object option.
   * @param  {Boolean} [options.safe]        The safe option.
   * @param  {Object}  [options.permissions] The permissions option.
   * @return {Promise<Object, Error>}
   */
  createRecord(record, options={}) {
    const reqOptions = this._collOptions(options);
    const { permissions } = reqOptions;
    const path = endpoint("record", this.bucket.name, this.name, record.id);
    const request = requests.createRequest(path, {data: record, permissions}, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Adds an attachment to a record, creating the record when it doesn't exist.
   *
   * @param  {String}  dataURL                 The data url.
   * @param  {Object}  [record={}]             The record data.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   * @param  {Object}  [options.permissions]   The permissions option.
   * @param  {String}  [options.filename]      Force the attachment filename.
   * @return {Promise<Object, Error>}
   */
  @capable(["attachments"])
  addAttachment(dataURI, record={}, options={}) {
    const reqOptions = this._collOptions(options);
    const {permissions} = reqOptions;
    const id = record.id || uuid.v4();
    const path = endpoint("attachment", this.bucket.name, this.name, id);
    const addAttachmentRequest = requests.addAttachmentRequest(path, dataURI, {
      data: record,
      permissions
    }, reqOptions);
    return this.client.execute(addAttachmentRequest, {stringify: false})
      .then(() => this.getRecord(id));
  }

  /**
   * Removes an attachment from a given record.
   *
   * @param  {Object}  recordId                The record id.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   */
  @capable(["attachments"])
  removeAttachment(recordId, options={}) {
    const reqOptions = this._collOptions(options);
    const path = endpoint("attachment", this.bucket.name, this.name, recordId);
    const request = requests.deleteRequest(path, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Updates a record in current collection.
   *
   * @param  {Object}  record                  The record to update.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   * @param  {Object}  [options.permissions]   The permissions option.
   * @return {Promise<Object, Error>}
   */
  updateRecord(record, options={}) {
    if (!isObject(record)) {
      throw new Error("A record object is required.");
    }
    if (!record.id) {
      throw new Error("A record id is required.");
    }
    const reqOptions = this._collOptions(options);
    const { permissions } = reqOptions;
    const path = endpoint("record", this.bucket.name, this.name, record.id);
    const request = requests.updateRequest(path, {data: record, permissions}, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Deletes a record from the current collection.
   *
   * @param  {Object|String} record                  The record to delete.
   * @param  {Object}        [options={}]            The options object.
   * @param  {Object}        [options.headers]       The headers object option.
   * @param  {Boolean}       [options.safe]          The safe option.
   * @param  {Number}        [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  deleteRecord(record, options={}) {
    const recordObj = toDataBody(record);
    if (!recordObj.id) {
      throw new Error("A record id is required.");
    }
    const {id, last_modified} = recordObj;
    const reqOptions = this._collOptions({ last_modified, ...options });
    const path = endpoint("record", this.bucket.name, this.name, id);
    const request = requests.deleteRequest(path, reqOptions);
    return this.client.execute(request);
  }

  /**
   * Retrieves a record from the current collection.
   *
   * @param  {String} id                The record id to retrieve.
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
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
   * @see http://kinto.readthedocs.io/en/stable/api/1.x/sorting.html
   *
   * Filtering is done by passing a `filters` option object:
   *
   * - `{fieldname: "value"}`
   * - `{min_fieldname: 4000}`
   * - `{in_fieldname: "1,2,3"}`
   * - `{not_fieldname: 0}`
   * - `{exclude_fieldname: "0,1"}`
   *
   * @see http://kinto.readthedocs.io/en/stable/api/1.x/filtering.html
   *
   * Paginating is done by passing a `limit` option, then calling the `next()`
   * method from the resolved result object to fetch the next page, if any.
   *
   * @param  {Object}   [options={}]                    The options object.
   * @param  {Object}   [options.headers]               The headers object option.
   * @param  {Object}   [options.filters=[]]            The filters object.
   * @param  {String}   [options.sort="-last_modified"] The sort field.
   * @param  {String}   [options.limit=null]            The limit field.
   * @param  {String}   [options.pages=1]               The number of result pages to aggregate.
   * @param  {Number}   [options.since=null]            Only retrieve records modified since the provided timestamp.
   * @return {Promise<Object, Error>}
   */
  listRecords(options={}) {
    const path = endpoint("record", this.bucket.name, this.name);
    const reqOptions = this._collOptions(options);
    return this.client.paginatedList(path, options, reqOptions);
  }

  /**
   * Performs batch operations at the current collection level.
   *
   * @param  {Function} fn                   The batch operation function.
   * @param  {Object}   [options={}]         The options object.
   * @param  {Object}   [options.headers]    The headers object option.
   * @param  {Boolean}  [options.safe]       The safe option.
   * @param  {Boolean}  [options.aggregate]  Produces a grouped result object.
   * @return {Promise<Object, Error>}
   */
  batch(fn, options={}) {
    const reqOptions = this._collOptions(options);
    return this.client.batch(fn, {
      ...reqOptions,
      bucket: this.bucket.name,
      collection: this.name,
    });
  }
}
