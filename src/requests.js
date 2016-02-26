import endpoint from "./endpoint";
import { quote } from "./utils.js";


/**
 * Request default options.
 * @type {Object}
 */
const requestDefaults = {
  safe: false,
  headers: {},
  bucket: "default",
  permissions: {},
  data: {},
  patch: false,
};

/**
 * @private
 */
function getLastModified(request) {
  return request.body &&
         "data" in request.body &&
         request.body.data.last_modified;
}

/**
 * @private
 */
function handleCacheHeaders(safe, request) {
  if (!safe) {
    return request;
  }
  const cacheHeaders = {};
  const lastModified = getLastModified(request);
  if (lastModified) {
    cacheHeaders["If-Match"] = quote(lastModified);
  } else {
    cacheHeaders["If-None-Match"] = "*";
  }
  return {
    ...request,
    headers: {
      ...request.headers,
      ...cacheHeaders
    }
  };
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
  return handleCacheHeaders(safe, {
    method: "PUT",
    path: endpoint("bucket", bucketName),
    headers,
    body: {
      // XXX We can't pass the data option just yet, see Kinto/kinto/issues/239
      permissions
    }
  });
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
  const { headers, permissions, safe, patch } = {
    ...requestDefaults,
    ...options
  };
  return handleCacheHeaders(safe, {
    method: patch ? "PATCH" : "PUT",
    path: endpoint("bucket", bucket.id),
    headers,
    body: {
      data: bucket,
      permissions
    }
  });
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
  const { headers, safe } = {...requestDefaults, ...options};
  return handleCacheHeaders(safe, {
    method: "DELETE",
    path: endpoint("bucket", bucket.id),
    headers,
    body: {
      data: bucket
    }
  });
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
  return handleCacheHeaders(safe, {
    method: id ? "PUT" : "POST",
    path,
    headers,
    body: {data, permissions}
  });
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
  const { bucket, headers, permissions, schema, safe, patch } = {
    ...requestDefaults,
    ...options
  };
  // XXX drop schema prop from collection obj if provided, as it's handled
  // by options
  const collectionData = collection;
  if (options.schema) {
    collectionData.schema = schema;
  }
  return handleCacheHeaders(safe, {
    method: patch ? "PATCH" : "PUT",
    path: endpoint("collection", bucket, collection.id),
    headers,
    body: {
      data: collectionData,
      permissions
    }
  });
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
  const { bucket, headers, safe } = {
    ...requestDefaults,
    ...options
  };
  return handleCacheHeaders(safe, {
    method: "DELETE",
    path: endpoint("collection", bucket, collection.id),
    headers,
    body: {
      data: collection
    }
  });
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
  return handleCacheHeaders(safe, {
    method: "POST",
    path: endpoint("records", bucket, collName),
    headers,
    body: {
      data: record,
      permissions
    }
  });
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
  const { bucket, headers, permissions, safe, patch } = {
    ...requestDefaults,
    ...options
  };
  return handleCacheHeaders(safe, {
    method: patch ? "PATCH" : "PUT",
    path: endpoint("record", bucket, collName, record.id),
    headers,
    body: {
      data: record,
      permissions
    }
  });
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
  const { bucket, headers, safe } = {...requestDefaults, ...options};
  return handleCacheHeaders(safe, {
    method: "DELETE",
    path: endpoint("record", bucket, collName, record.id),
    headers,
    body: {
      data: record
    }
  });
}
