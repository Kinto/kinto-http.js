import uuid from "uuid/v4";

import { capable, toDataBody, isObject } from "./utils";
import * as requests from "./requests";
import endpoint from "./endpoint";
import { addEndpointOptions } from "./utils";
import KintoClientBase, { PaginatedListParams, PaginationResult } from "./base";
import Bucket from "./bucket";
import {
  KintoRequest,
  Permission,
  KintoResponse,
  KintoIdObject,
  KintoObject,
  Attachment,
  HistoryEntry,
  OperationResponse,
} from "./types";
import { HttpResponse } from "./http";
import { AggregateResponse } from "./batch";

export interface CollectionOptions {
  headers?: Record<string, string>;
  safe?: boolean;
  retry?: number;
}

/**
 * Abstract representation of a selected collection.
 *
 */
export default class Collection {
  public client: KintoClientBase;
  private bucket: Bucket;
  public name: string;
  private _retry: number;
  private _safe: boolean;
  private _headers: Record<string, string>;

  /**
   * Constructor.
   *
   * @param  {KintoClient}  client            The client instance.
   * @param  {Bucket}       bucket            The bucket instance.
   * @param  {String}       name              The collection name.
   * @param  {Object}       [options={}]      The options object.
   * @param  {Object}       [options.headers] The headers object option.
   * @param  {Boolean}      [options.safe]    The safe option.
   * @param  {Number}       [options.retry]   The retry option.
   * @param  {Boolean}      [options.batch]   (Private) Whether this
   *     Collection is operating as part of a batch.
   */
  constructor(
    client: KintoClientBase,
    bucket: Bucket,
    name: string,
    options: CollectionOptions = {}
  ) {
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
     * @ignore
     */
    this._retry = options.retry || 0;
    this._safe = !!options.safe;
    // FIXME: This is kind of ugly; shouldn't the bucket be responsible
    // for doing the merge?
    this._headers = {
      ...this.bucket.headers,
      ...options.headers,
    };
  }

  /**
   * Get the value of "headers" for a given request, merging the
   * per-request headers with our own "default" headers.
   *
   * @private
   */
  private _getHeaders(options: {
    headers?: Record<string, string>;
  }): Record<string, string> {
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
  private _getSafe(options: { safe?: boolean }): boolean {
    return { safe: this._safe, ...options }.safe;
  }

  /**
   * As _getSafe, but for "retry".
   *
   * @private
   */
  private _getRetry(options: { retry?: number }): number {
    return { retry: this._retry, ...options }.retry;
  }

  /**
   * Retrieves the total number of records in this collection.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @param  {Number} [options.retry=0] Number of retries to make
   *     when faced with transient errors.
   * @return {Promise<Number, Error>}
   */
  async getTotalRecords(
    options: { headers?: Record<string, string>; retry?: number } = {}
  ): Promise<number> {
    const path = endpoint.record(this.bucket.name, this.name);
    const request: KintoRequest = {
      headers: this._getHeaders(options),
      path,
      method: "HEAD",
    };
    const { headers } = await this.client.execute(request, {
      raw: true,
      retry: this._getRetry(options),
    });
    return parseInt(headers.get("Total-Records"), 10);
  }

  /**
   * Retrieves the ETag of the records list, for use with the `since` filtering option.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @param  {Number} [options.retry=0] Number of retries to make
   *     when faced with transient errors.
   * @return {Promise<String, Error>}
   */
  async getRecordsTimestamp(
    options: { headers?: Record<string, string>; retry?: number } = {}
  ): Promise<string | null> {
    const path = endpoint.record(this.bucket.name, this.name);
    const request: KintoRequest = {
      headers: this._getHeaders(options),
      path,
      method: "HEAD",
    };
    const { headers } = (await this.client.execute(request, {
      raw: true,
      retry: this._getRetry(options),
    })) as HttpResponse<unknown>;
    return headers.get("ETag");
  }

  /**
   * Retrieves collection data.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @param  {Object} [options.query]   Query parameters to pass in
   *     the request. This might be useful for features that aren't
   *     yet supported by this library.
   * @param  {Array}  [options.fields]  Limit response to
   *     just some fields.
   * @param  {Number} [options.retry=0] Number of retries to make
   *     when faced with transient errors.
   * @return {Promise<Object, Error>}
   */
  async getData<T>(
    options: {
      headers?: Record<string, string>;
      query?: { [key: string]: string };
      fields?: string[];
      retry?: number;
    } = {}
  ): Promise<T> {
    let path = endpoint.collection(this.bucket.name, this.name);
    path = addEndpointOptions(path, options);
    const request = { headers: this._getHeaders(options), path };
    const { data } = (await this.client.execute(request, {
      retry: this._getRetry(options),
    })) as { data: T };
    return data;
  }

  /**
   * Set collection data.
   * @param  {Object}   data                    The collection data object.
   * @param  {Object}   [options={}]            The options object.
   * @param  {Object}   [options.headers]       The headers object option.
   * @param  {Number}   [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean}  [options.safe]          The safe option.
   * @param  {Boolean}  [options.patch]         The patch option.
   * @param  {Number}   [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async setData(
    data: { last_modified?: number; [key: string]: any },
    options: {
      headers?: Record<string, string>;
      safe?: boolean;
      retry?: number;
      patch?: boolean;
      last_modified?: number;
      permissions?: { [key in Permission]?: string[] };
    } = {}
  ): Promise<KintoResponse<unknown>> {
    if (!isObject(data)) {
      throw new Error("A collection object is required.");
    }
    const { patch, permissions } = options;
    const { last_modified } = { ...data, ...options };

    const path = endpoint.collection(this.bucket.name, this.name);
    const request = requests.updateRequest(
      path,
      { data, permissions },
      {
        last_modified,
        patch,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute<KintoResponse>(request, {
      retry: this._getRetry(options),
    }) as Promise<KintoResponse<unknown>>;
  }

  /**
   * Retrieves the list of permissions for this collection.
   *
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @param  {Number} [options.retry=0] Number of retries to make
   *     when faced with transient errors.
   * @return {Promise<Object, Error>}
   */
  async getPermissions(
    options: {
      headers?: Record<string, string>;
      retry?: number;
    } = {}
  ): Promise<{ [key in Permission]?: string[] }> {
    const path = endpoint.collection(this.bucket.name, this.name);
    const request = { headers: this._getHeaders(options), path };
    const { permissions } = (await this.client.execute<KintoResponse>(request, {
      retry: this._getRetry(options),
    })) as KintoResponse;
    return permissions;
  }

  /**
   * Replaces all existing collection permissions with the ones provided.
   *
   * @param  {Object}   permissions             The permissions object.
   * @param  {Object}   [options={}]            The options object
   * @param  {Object}   [options.headers]       The headers object option.
   * @param  {Number}   [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean}  [options.safe]          The safe option.
   * @param  {Number}   [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async setPermissions(
    permissions: { [key in Permission]?: string[] },
    options: {
      safe?: boolean;
      headers?: Record<string, string>;
      retry?: number;
      last_modified?: number;
    } = {}
  ): Promise<KintoResponse<unknown>> {
    if (!isObject(permissions)) {
      throw new Error("A permissions object is required.");
    }
    const path = endpoint.collection(this.bucket.name, this.name);
    const data = { last_modified: options.last_modified };
    const request = requests.updateRequest(
      path,
      { data, permissions },
      {
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute<KintoResponse>(request, {
      retry: this._getRetry(options),
    }) as Promise<KintoResponse<unknown>>;
  }

  /**
   * Append principals to the collection permissions.
   *
   * @param  {Object}  permissions             The permissions object.
   * @param  {Object}  [options={}]            The options object
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Number}  [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Object}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async addPermissions(
    permissions: { [key in Permission]?: string[] },
    options: {
      safe?: boolean;
      headers?: Record<string, string>;
      retry?: number;
      last_modified?: number;
    } = {}
  ): Promise<unknown> {
    if (!isObject(permissions)) {
      throw new Error("A permissions object is required.");
    }
    const path = endpoint.collection(this.bucket.name, this.name);
    const { last_modified } = options;
    const request = requests.jsonPatchPermissionsRequest(
      path,
      permissions,
      "add",
      {
        last_modified,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Remove principals from the collection permissions.
   *
   * @param  {Object}  permissions             The permissions object.
   * @param  {Object}  [options={}]            The options object
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Number}  [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Object}  [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async removePermissions(
    permissions: { [key in Permission]?: string[] },
    options: {
      safe?: boolean;
      headers?: Record<string, string>;
      retry?: number;
      last_modified?: number;
    } = {}
  ): Promise<unknown> {
    if (!isObject(permissions)) {
      throw new Error("A permissions object is required.");
    }
    const path = endpoint.collection(this.bucket.name, this.name);
    const { last_modified } = options;
    const request = requests.jsonPatchPermissionsRequest(
      path,
      permissions,
      "remove",
      {
        last_modified,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Creates a record in current collection.
   *
   * @param  {Object}  record                The record to create.
   * @param  {Object}  [options={}]          The options object.
   * @param  {Object}  [options.headers]     The headers object option.
   * @param  {Number}  [options.retry=0]     Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean} [options.safe]        The safe option.
   * @param  {Object}  [options.permissions] The permissions option.
   * @return {Promise<Object, Error>}
   */
  async createRecord(
    record: { id?: string; [key: string]: any },
    options: {
      headers?: Record<string, string>;
      retry?: number;
      safe?: boolean;
      permissions?: { [key in Permission]?: string[] };
    } = {}
  ): Promise<KintoResponse<unknown>> {
    const { permissions } = options;
    const path = endpoint.record(this.bucket.name, this.name, record.id);
    const request = requests.createRequest(
      path,
      { data: record, permissions },
      {
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    return this.client.execute<KintoResponse>(request, {
      retry: this._getRetry(options),
    }) as Promise<KintoResponse<unknown>>;
  }

  /**
   * Adds an attachment to a record, creating the record when it doesn't exist.
   *
   * @param  {String}  dataURL                 The data url.
   * @param  {Object}  [record={}]             The record data.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Number}  [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   * @param  {Object}  [options.permissions]   The permissions option.
   * @param  {String}  [options.filename]      Force the attachment filename.
   * @param  {String}  [options.gzipped]       Force the attachment to be gzipped or not.
   * @return {Promise<Object, Error>}
   */
  @capable(["attachments"])
  async addAttachment(
    dataURI: string,
    record: { [key: string]: string } = {},
    options: {
      headers?: Record<string, string>;
      retry?: number;
      safe?: boolean;
      last_modified?: number;
      permissions?: { [key in Permission]?: string[] };
      filename?: string;
      gzipped?: boolean;
    } = {}
  ): Promise<
    KintoResponse<{
      attachment: Attachment;
    }>
  > {
    const { permissions } = options;
    const id = record.id || uuid();
    const path = endpoint.attachment(this.bucket.name, this.name, id);
    const { last_modified } = { ...record, ...options };
    const addAttachmentRequest = requests.addAttachmentRequest(
      path,
      dataURI,
      { data: record, permissions },
      {
        last_modified,
        filename: options.filename,
        gzipped: options.gzipped,
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
      }
    );
    await this.client.execute(addAttachmentRequest, {
      stringify: false,
      retry: this._getRetry(options),
    });
    return this.getRecord<{ attachment: Attachment }>(id);
  }

  /**
   * Removes an attachment from a given record.
   *
   * @param  {Object}  recordId                The record id.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Number}  [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   */
  @capable(["attachments"])
  async removeAttachment(
    recordId: string,
    options: {
      headers?: Record<string, string>;
      retry?: number;
      safe?: boolean;
      last_modified?: number;
    } = {}
  ): Promise<unknown> {
    const { last_modified } = options;
    const path = endpoint.attachment(this.bucket.name, this.name, recordId);
    const request = requests.deleteRequest(path, {
      last_modified,
      headers: this._getHeaders(options),
      safe: this._getSafe(options),
    });
    return this.client.execute(request, { retry: this._getRetry(options) });
  }

  /**
   * Updates a record in current collection.
   *
   * @param  {Object}  record                  The record to update.
   * @param  {Object}  [options={}]            The options object.
   * @param  {Object}  [options.headers]       The headers object option.
   * @param  {Number}  [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean} [options.safe]          The safe option.
   * @param  {Number}  [options.last_modified] The last_modified option.
   * @param  {Object}  [options.permissions]   The permissions option.
   * @return {Promise<Object, Error>}
   */
  async updateRecord(
    record: KintoIdObject,
    options: {
      headers?: Record<string, string>;
      retry?: number;
      safe?: boolean;
      last_modified?: number;
      permissions?: { [key in Permission]?: string[] };
      patch?: boolean;
    } = {}
  ): Promise<KintoResponse<unknown>> {
    if (!isObject(record)) {
      throw new Error("A record object is required.");
    }
    if (!record.id) {
      throw new Error("A record id is required.");
    }
    const { permissions } = options;
    const { last_modified } = { ...record, ...options };
    const path = endpoint.record(this.bucket.name, this.name, record.id);
    const request = requests.updateRequest(
      path,
      { data: record, permissions },
      {
        headers: this._getHeaders(options),
        safe: this._getSafe(options),
        last_modified,
        patch: !!options.patch,
      }
    );
    return this.client.execute<KintoResponse>(request, {
      retry: this._getRetry(options),
    }) as Promise<KintoResponse<unknown>>;
  }

  /**
   * Deletes a record from the current collection.
   *
   * @param  {Object|String} record                  The record to delete.
   * @param  {Object}        [options={}]            The options object.
   * @param  {Object}        [options.headers]       The headers object option.
   * @param  {Number}        [options.retry=0]       Number of retries to make
   *     when faced with transient errors.
   * @param  {Boolean}       [options.safe]          The safe option.
   * @param  {Number}        [options.last_modified] The last_modified option.
   * @return {Promise<Object, Error>}
   */
  async deleteRecord(
    record: string | KintoIdObject,
    options: {
      headers?: Record<string, string>;
      retry?: number;
      safe?: boolean;
      last_modified?: number;
    } = {}
  ): Promise<KintoResponse<unknown>> {
    const recordObj = toDataBody(record);
    if (!recordObj.id) {
      throw new Error("A record id is required.");
    }
    const { id } = recordObj;
    const { last_modified } = { ...recordObj, ...options };
    const path = endpoint.record(this.bucket.name, this.name, id);
    const request = requests.deleteRequest(path, {
      last_modified,
      headers: this._getHeaders(options),
      safe: this._getSafe(options),
    });
    return this.client.execute<KintoResponse>(request, {
      retry: this._getRetry(options),
    }) as Promise<KintoResponse<unknown>>;
  }

  /**
   * Retrieves a record from the current collection.
   *
   * @param  {String} id                The record id to retrieve.
   * @param  {Object} [options={}]      The options object.
   * @param  {Object} [options.headers] The headers object option.
   * @param  {Object} [options.query]   Query parameters to pass in
   *     the request. This might be useful for features that aren't
   *     yet supported by this library.
   * @param  {Array}  [options.fields]  Limit response to
   *     just some fields.
   * @param  {Number} [options.retry=0] Number of retries to make
   *     when faced with transient errors.
   * @return {Promise<Object, Error>}
   */
  async getRecord<T>(
    id: string,
    options: {
      headers?: Record<string, string>;
      query?: { [key: string]: string };
      fields?: string[];
      retry?: number;
    } = {}
  ): Promise<KintoResponse<T>> {
    let path = endpoint.record(this.bucket.name, this.name, id);
    path = addEndpointOptions(path, options);
    const request = { headers: this._getHeaders(options), path };
    return this.client.execute<KintoResponse<T>>(request, {
      retry: this._getRetry(options),
    }) as Promise<KintoResponse<T>>;
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
   * @param  {Number}   [options.retry=0]               Number of retries to make
   *     when faced with transient errors.
   * @param  {Object}   [options.filters={}]            The filters object.
   * @param  {String}   [options.sort="-last_modified"] The sort field.
   * @param  {String}   [options.at]                    The timestamp to get a snapshot at.
   * @param  {String}   [options.limit=null]            The limit field.
   * @param  {String}   [options.pages=1]               The number of result pages to aggregate.
   * @param  {Number}   [options.since=null]            Only retrieve records modified since the provided timestamp.
   * @param  {Array}    [options.fields]                Limit response to just some fields.
   * @return {Promise<Object, Error>}
   */
  async listRecords<T extends KintoObject>(
    options: PaginatedListParams & {
      headers?: Record<string, string>;
      retry?: number;
      at?: number;
    } = {}
  ): Promise<PaginationResult<T>> {
    const path = endpoint.record(this.bucket.name, this.name);
    if (options.at) {
      return this.getSnapshot<T>(options.at);
    } else {
      return this.client.paginatedList<T>(path, options, {
        headers: this._getHeaders(options),
        retry: this._getRetry(options),
      });
    }
  }

  /**
   * @private
   */
  async isHistoryComplete(): Promise<boolean> {
    // We consider that if we have the collection creation event part of the
    // history, then all records change events have been tracked.
    const {
      data: [oldestHistoryEntry],
    } = await this.bucket.listHistory({
      limit: 1,
      filters: {
        action: "create",
        resource_name: "collection",
        collection_id: this.name,
      },
    });
    return !!oldestHistoryEntry;
  }

  /**
   * @private
   */
  async listChangesBackTo<T>(at: number): Promise<HistoryEntry<T>[]> {
    // Ensure we have enough history data to retrieve the complete list of
    // changes.
    if (!(await this.isHistoryComplete())) {
      throw new Error(
        "Computing a snapshot is only possible when the full history for a " +
          "collection is available. Here, the history plugin seems to have " +
          "been enabled after the creation of the collection."
      );
    }
    const { data: changes } = await this.bucket.listHistory<T>({
      pages: Infinity, // all pages up to target timestamp are required
      sort: "-target.data.last_modified",
      filters: {
        resource_name: "record",
        collection_id: this.name,
        "max_target.data.last_modified": String(at), // eq. to <=
      },
    });
    return changes;
  }

  /**
   * @private
   */
  @capable(["history"])
  async getSnapshot<T extends KintoObject>(
    at: number
  ): Promise<PaginationResult<T>> {
    if (!at || !Number.isInteger(at) || at <= 0) {
      throw new Error("Invalid argument, expected a positive integer.");
    }
    // Retrieve history and check it covers the required time range.
    const changes = await this.listChangesBackTo<T>(at);
    // Replay changes to compute the requested snapshot.
    const seenIds = new Set();
    let snapshot: T[] = [];
    for (const {
      action,
      target: { data: record },
    } of changes) {
      if (action == "delete") {
        seenIds.add(record.id); // ensure not reprocessing deleted entries
        snapshot = snapshot.filter(r => r.id !== record.id);
      } else if (!seenIds.has(record.id)) {
        seenIds.add(record.id);
        snapshot.push(record);
      }
    }
    return {
      last_modified: String(at),
      data: snapshot.sort((a, b) => b.last_modified - a.last_modified),
      next: () => {
        throw new Error("Snapshots don't support pagination");
      },
      hasNextPage: false,
      totalRecords: snapshot.length,
    } as PaginationResult<T>;
  }

  /**
   * Performs batch operations at the current collection level.
   *
   * @param  {Function} fn                   The batch operation function.
   * @param  {Object}   [options={}]         The options object.
   * @param  {Object}   [options.headers]    The headers object option.
   * @param  {Boolean}  [options.safe]       The safe option.
   * @param  {Number}   [options.retry]      The retry option.
   * @param  {Boolean}  [options.aggregate]  Produces a grouped result object.
   * @return {Promise<Object, Error>}
   */
  async batch(
    fn: (client: Collection) => void,
    options: {
      headers?: Record<string, string>;
      safe?: boolean;
      retry?: number;
      aggregate?: boolean;
    } = {}
  ): Promise<OperationResponse<KintoObject>[] | AggregateResponse> {
    return this.client.batch(fn, {
      bucket: this.bucket.name,
      collection: this.name,
      headers: this._getHeaders(options),
      retry: this._getRetry(options),
      safe: this._getSafe(options),
      aggregate: !!options.aggregate,
    });
  }

  /**
   * Retrieves collection server endpoints.
   *
   * @return {Object}
   */
  get endpoint(): Record<string, Function> {
    return {
      toString: () => endpoint.collection(this.bucket.name, this.name),
      collection: () => endpoint.collection(this.bucket.name, this.name),
      record: (id?: string) => endpoint.record(this.bucket.name, this.name, id),
      attachment: (id: string) =>
        endpoint.attachment(this.bucket.name, this.name, id),
    };
  }
}
