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
  }

  getPermissions(options={forceReload: false}) {
    if (this._permissions && !options.forceReload) {
      return Promise.resolve(this._permissions);
    }
    return this.client.getCollection(this.name)
      .then(res => {
        this._permissions = res.permissions;
        return res.permissions;
      });
  }

  setPermissions(permissions) {
    //return this.client.updateCollection();
  }

  getSchema() {
    //
  }

  setSchema() {
    //
  }

  createRecord(record, options) {
    return this.client.createRecord(this.name, record, {...options, bucket: this.bucket.name});
  }

  updateRecord(record, options) {
    return this.client.updateRecord(this.name, record, {...options, bucket: this.bucket.name});
  }

  deleteRecord(id) {

  }

  list(options) {
    return this.client.getRecords(this.name, {...options, bucket: this.bucket.name})
      .then(res => res.data);
  }

  batch(fn, options) {
    // XXX bind with collection name as first arg
    return this.client.batch(fn, {...options, bucket: this.bucket.name});
  }
}
