import endpoint from "./endpoint";
import { omit, removeUndefined } from "./utils";

const requestDefaults = {
  safe: false,
  // check if we should set default content type here
  headers: {},
  bucket: "default",
  permissions: undefined,
  data: undefined,
  patch: false,
};

function safeHeader(safe, last_modified) {
  if (!safe) {
    return {};
  }
  if (last_modified) {
    return {"If-Match": `"${last_modified}"`};
  }
  return {"If-None-Match": "*"};
}


function _create(path, {data, permissions}, options={}) {
  const { headers, safe } = {
    ...requestDefaults,
    ...options,
  };
  return removeUndefined({
    method: data && data.id ? "PUT" : "POST",
    path,
    headers: {...headers, ...safeHeader(safe)},
    body: {
      data,
      permissions
    }
  });
}

function _update(path, {data, permissions}, options={}) {
  const {
    headers,
    safe,
    patch,
  } = {...requestDefaults, ...options};
  const { last_modified } = { ...data, ...options };

  if (Object.keys(omit(data, "id", "last_modified")).length === 0) {
    data = undefined;
  }

  return removeUndefined({
    method: patch ? "PATCH" : "PUT",
    path,
    headers: {
      ...headers,
      ...safeHeader(safe, last_modified)
    },
    body: {
      data,
      permissions
    }
  });
}

function _delete(path, options={}) {
  const { headers, safe, last_modified} = {
    ...requestDefaults,
    ...options
  };
  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path,
    headers: {...headers, ...safeHeader(safe, last_modified)}
  };
}


/**
 * @private
 */
export function createBucket(bucketName, options={}) {
  if (!bucketName) {
    throw new Error("A bucket name is required.");
  }
  // Note that we simply ignore any "bucket" option passed here, as the one
  // we're interested in is the one provided as a required argument.
  const { data={}, permissions } = options;
  data.id = bucketName;
  const path = endpoint("bucket", bucketName);
  return _create(path, {data, permissions}, options);
}

/**
 * @private
 */
export function updateBucket(bucket, options={}) {
  if (typeof bucket !== "object") {
    throw new Error("A bucket object is required.");
  }
  if (!bucket.id) {
    throw new Error("A bucket id is required.");
  }
  const { permissions } = { ...requestDefaults, ...options };

  // For default bucket, we need to drop the id from the data object.
  const bucketId = bucket.id;
  if (bucket.id === "default") {
    delete bucket.id;
  }
  const path = endpoint("bucket", bucketId);
  return _update(path, {data: bucket, permissions}, options);
}

/**
 * @private
 */
export function deleteBucket(bucket, options={}) {
  if (typeof bucket !== "object") {
    throw new Error("A bucket object is required.");
  }
  if (!bucket.id) {
    throw new Error("A bucket id is required.");
  }
  options = { last_modified: bucket.last_modified, ...options };
  const path = endpoint("bucket", bucket.id);
  return _delete(path, options);
}

/**
 * @private
 */
export function deleteBuckets(options={}) {
  const path = endpoint("buckets");
  return _delete(path, options);
}

/**
 * @private
 */
export function createCollection(id, options={}) {
  const { bucket, permissions, data={} } = {
    ...requestDefaults,
    ...options
  };
  data.id = id;
  const path = id ? endpoint("collection", bucket, id) :
                    endpoint("collections", bucket);
  return _create(path, {data, permissions}, options);
}

/**
 * @private
 */
export function updateCollection(collection, options={}) {
  if (typeof collection !== "object") {
    throw new Error("A collection object is required.");
  }
  if (!collection.id) {
    throw new Error("A collection id is required.");
  }
  const {
    bucket,
    permissions,
  } = {...requestDefaults, ...options};

  const path = endpoint("collection", bucket, collection.id);
  return _update(path, {data: collection, permissions}, options);
}

/**
 * @private
 */
export function deleteCollection(collection, options={}) {
  if (typeof collection !== "object") {
    throw new Error("A collection object is required.");
  }
  if (!collection.id) {
    throw new Error("A collection id is required.");
  }
  const { bucket } = {
    ...requestDefaults,
    ...options
  };
  // XXX throw if no options.bucket
  options = { last_modified: collection.last_modified, ...options };
  const path = endpoint("collection", bucket, collection.id);
  return _delete(path, options);
}

/**
 * @private
 */
export function createRecord(collName, record, options={}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  const { bucket, permissions } = {
    ...requestDefaults,
    ...options
  };
  // XXX throw if bucket is undefined
  const path = record.id ? endpoint("record", bucket, collName, record.id) :
                           endpoint("records", bucket, collName);
  return _create(path, {data: record, permissions}, options);
}

/**
 * @private
 */
export function updateRecord(collName, record, options={}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  if (!record.id) {
    throw new Error("A record id is required.");
  }
  const { bucket, permissions } = {
    ...requestDefaults,
    ...options
  };
  const path = endpoint("record", bucket, collName, record.id);
  return _update(path, {data: record, permissions}, options);
}

/**
 * @private
 */
export function deleteRecord(collName, record, options={}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  if (typeof record !== "object") {
    throw new Error("A record object is required.");
  }
  if (!record.id) {
    throw new Error("A record id is required.");
  }
  const { bucket } = {
    ...requestDefaults,
    ...options
  };
  options = { last_modified: record.last_modified, ...options };
  const path = endpoint("record", bucket, collName, record.id);
  return _delete(path, options);
}
