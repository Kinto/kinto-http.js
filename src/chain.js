export class Bucket {
  constructor(client, name) {
    this.client = client;
    this.name = name;
  }

  collection(name) {
    return new Collection(this.client, this, name);
  }
}

export class Collection {
  constructor(client, bucket, name) {
    this.client = client;
    this.bucket = bucket;
    this.name = name;
    this._permissions = null;
    this._schema = null;
  }

  getPermissions(options={forceReload: false}) {
    if (this._permissions && !options.forceReload) {
      return Promise.resolve(this._permissions);
    }
    return this.client.getCollection(this.name)
      .then(res => {
        this._permissions = res.permissions;
        return this._permissions;
      });
  }

  setPermissions(type, permissions, options) {
    if (["read", "write"].indexOf(type) === -1) {
      throw new Error("Permissions type must be read or write.");
    }
    return this.client.updateCollection(this.name, {
      permissions: {[type]: permissions}
    }, {...options, bucket: this.bucket.name});
  }

  getSchema(options={forceReload: false}) {
    if (this._schema && !options.forceReload) {
      return Promise.resolve(this._schema);
    }
    return this.client.getCollection(this.name)
      .then(res => {
        this._schema = res.data && res.data.schema || null;
        return this._schema;
      });
  }

  setSchema(schema, options) {
    return this.client.updateCollection(this.name, {data: {schema}}, {
      ...options,
      bucket: this.bucket.name
    });
  }

  createRecord(record, options) {
    return this.client.createRecord(this.name, record, {
      ...options,
      bucket: this.bucket.name
    });
  }

  updateRecord(record, options) {
    return this.client.updateRecord(this.name, record, {
      ...options,
      bucket: this.bucket.name
    });
  }

  deleteRecord(id) {

  }

  list(options) {
    return this.client.getRecords(this.name, {
      ...options,
      bucket: this.bucket.name
    })
      .then(res => res.data);
  }

  batch(fn, options) {
    // XXX bind with collection name as first arg
    return this.client.batch(fn, {
      ...options,
      collection: this.name,
      bucket: this.bucket.name
    });
  }
}
