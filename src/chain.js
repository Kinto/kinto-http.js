export class Bucket {
  constructor(client, name) {
    this.client = client;
    this.name = name;
  }

  collection(name) {
    return new Collection(this.client, this, name);
  }

  getCollections(options) {
    return this.client.getCollections(this.name, {
      ...options,
      bucket: this.name
    });
  }

  createCollection(...args) {
    let createOptions = {bucket: this.name};
    if (typeof args[0] === "string") {
      createOptions.id = args[0];
      if (typeof args[1] === "object") {
        createOptions = {...args[1], ...createOptions};
      }
    } else {
      createOptions = {...args[0], createOptions};
    }
    return this.client.createCollection(createOptions);
  }

  deleteCollection(id, options) {
    return this.client.deleteCollection(id, {
      ...options,
      bucket: this.name
    });
  }

  getPermissions(options) {
    return this.client.getBucket(this.name, options)
      .then(res => res.permissions);
  }

  setPermissions(type, permissions, options) {
    if (["read", "write"].indexOf(type) === -1) {
      throw new Error("Permissions type must be read or write.");
    }
    return this.client.updateBucket(this.name, {}, {
      ...options,
      permissions: {[type]: permissions},
    });
  }
}

export class Collection {
  constructor(client, bucket, name) {
    this.client = client;
    this.bucket = bucket;
    this.name = name;
  }

  getPermissions(options) {
    return this.client.getCollection(this.name, {
      ...options,
      bucket: this.bucket.name
    })
      .then(res => res.permissions);
  }

  setPermissions(type, permissions, options) {
    if (["read", "write"].indexOf(type) === -1) {
      throw new Error("Permissions type must be read or write.");
    }
    return this.client.updateCollection(this.name, {}, {
      ...options,
      permissions: {[type]: permissions},
      bucket: this.bucket.name
    });
  }

  getSchema(options) {
    return this.client.getCollection(this.name, {
      ...options,
      bucket: this.bucket.name
    })
      .then(res => res.data && res.data.schema || null);
  }

  setSchema(schema, options) {
    return this.client.updateCollection(this.name, {}, {
      ...options,
      schema,
      bucket: this.bucket.name
    });
  }

  getMetas(options) {
    return this.client.getCollection(this.name, {
      ...options,
      bucket: this.bucket.name
    })
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

  setMetas(metas, options) {
    return this.client.updateCollection(this.name, metas, {
      ...options,
      patch: true,
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

  deleteRecord(id, options) {
    return this.client.deleteRecord(this.name, id, {
      ...options,
      bucket: this.bucket.name
    });
  }

  list(options) {
    return this.client.getRecords(this.name, {
      ...options,
      bucket: this.bucket.name
    })
      .then(res => res.data);
  }

  batch(fn, options) {
    return this.client.batch(fn, {
      ...options,
      collection: this.name,
      bucket: this.bucket.name
    });
  }
}
