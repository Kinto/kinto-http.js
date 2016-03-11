import endpoint from "./endpoint";


const requestDefaults = {
  safe: false,
  // check if we should set default content type here
  headers: {},
  bucket: "default",
  permissions: {},
  data: {},
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

/**
 * @private
 */
export function createBucket(bucketName, options = {}) {
  if (!bucketName) {
    throw new Error("A bucket name is required.");
  }
  // Note that we simply ignore any "bucket" option passed here, as the one
  // we're interested in is the one provided as a required argument.
  const { headers, permissions, safe } = {...requestDefaults, ...options};
  return {
    method: "PUT",
    path: endpoint("bucket", bucketName),
    headers: {...headers, ...safeHeader(safe)},
    body: {
      // XXX We can't pass the data option just yet, see Kinto/kinto/issues/239
      permissions
    }
  };
}

/**
 * @private
 */
export function updateBucket(bucket, options = {}) {
  if (typeof bucket !== "object") {
    throw new Error("A bucket object is required.");
  }
  if (!bucket.id) {
    throw new Error("A bucket id is required.");
  }
  const { headers, permissions, safe, patch, last_modified } = {
    ...requestDefaults,
    ...options
  };
  return {
    method: patch ? "PATCH" : "PUT",
    path: endpoint("bucket", bucket.id),
    headers: {
      ...headers,
      ...safeHeader(safe, last_modified || bucket.last_modified)
    },
    body: {
      data: bucket,
      permissions
    }
  };
}

/**
 * @private
 */
export function deleteBucket(bucket, options = {}) {
  if (typeof bucket !== "object") {
    throw new Error("A bucket object is required.");
  }
  if (!bucket.id) {
    throw new Error("A bucket id is required.");
  }
  const { headers, safe, last_modified} = {
    ...requestDefaults,
    last_modified: bucket.last_modified,
    ...options
  };
  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path: endpoint("bucket", bucket.id),
    headers: {...headers, ...safeHeader(safe, last_modified)}
  };
}

/**
 * @private
 */
export function deleteBuckets(options = {}) {
  const { headers, safe, last_modified} = {
    ...requestDefaults,
    ...options
  };
  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path: endpoint("buckets"),
    headers: {...headers, ...safeHeader(safe, last_modified)},
  };
}


/**
 * @private
 */
export function deleteBuckets(options = {}) {
  const { headers, safe, last_modified} = {
    ...requestDefaults,
    ...options
  };
  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path: endpoint("buckets"),
    headers: {...headers, ...safeHeader(safe, last_modified)},
  };
}

/**
 * @private
 */
export function createCollection(id, options = {}) {
  const { bucket, headers, permissions, data, safe } = {
    ...requestDefaults,
    ...options
  };
  // XXX checks that provided data can't override schema when provided
  const path = id ? endpoint("collection", bucket, id) :
                    endpoint("collections", bucket);
  return {
    method: id ? "PUT" : "POST",
    path,
    headers: {...headers, ...safeHeader(safe)},
    body: {data, permissions}
  };
}

/**
 * @private
 */
export function updateCollection(collection, options = {}) {
  if (typeof collection !== "object") {
    throw new Error("A collection object is required.");
  }
  if (!collection.id) {
    throw new Error("A collection id is required.");
  }
  const {
    bucket,
    headers,
    permissions,
    schema,
    metadata,
    safe,
    patch,
    last_modified
  } = {...requestDefaults, ...options};
  const collectionData = {...metadata, ...collection};
  if (options.schema) {
    collectionData.schema = schema;
  }
  return {
    method: patch ? "PATCH" : "PUT",
    path: endpoint("collection", bucket, collection.id),
    headers: {
      ...headers,
      ...safeHeader(safe, last_modified || collection.last_modified)
    },
    body: {
      data: collectionData,
      permissions
    }
  };
}

/**
 * @private
 */
export function deleteCollection(collection, options = {}) {
  if (typeof collection !== "object") {
    throw new Error("A collection object is required.");
  }
  if (!collection.id) {
    throw new Error("A collection id is required.");
  }
  const { bucket, headers, safe, last_modified } = {
    ...requestDefaults,
    last_modified: collection.last_modified,
    ...options
  };
  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path: endpoint("collection", bucket, collection.id),
    headers: {...headers, ...safeHeader(safe, last_modified)}
  };
}

/**
 * @private
 */
export function createRecord(collName, record, options = {}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  const { bucket, headers, permissions, safe } = {
    ...requestDefaults,
    ...options
  };
  return {
    // Note: Safe POST using a record id would fail.
    // see https://github.com/Kinto/kinto/issues/489
    method: record.id ? "PUT" : "POST",
    path:   record.id ? endpoint("record", bucket, collName, record.id) :
                        endpoint("records", bucket, collName),
    headers: {...headers, ...safeHeader(safe)},
    body: {
      data: record,
      permissions
    }
  };
}

/**
 * @private
 */
export function updateRecord(collName, record, options = {}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  if (!record.id) {
    throw new Error("A record id is required.");
  }
  const { bucket, headers, permissions, safe, patch, last_modified } = {
    ...requestDefaults,
    ...options
  };
  return {
    method: patch ? "PATCH" : "PUT",
    path: endpoint("record", bucket, collName, record.id),
    headers: {
      ...headers,
      ...safeHeader(safe, last_modified || record.last_modified)
    },
    body: {
      data: record,
      permissions
    }
  };
}

/**
 * @private
 */
export function deleteRecord(collName, record, options = {}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  if (typeof record !== "object") {
    throw new Error("A record object is required.");
  }
  if (!record.id) {
    throw new Error("A record id is required.");
  }
  const { bucket, headers, safe, last_modified } = {
    ...requestDefaults,
    last_modified: record.last_modified,
    ...options
  };
  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path: endpoint("record", bucket, collName, record.id),
    headers: {...headers, ...safeHeader(safe, last_modified)}
  };
}
