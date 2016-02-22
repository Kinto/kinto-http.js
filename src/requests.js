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
export function createCollection(options = {}) {
  const { bucket, headers, permissions, data, safe, id } = {
    ...requestDefaults,
    ...options
  };
  const path = options.id ? endpoint("collection", bucket, id) :
                            endpoint("collections", bucket);
  return handleCacheHeaders(safe, {
    method: options.id ? "PUT" : "POST",
    path,
    headers,
    body: {data, permissions}
  });
}

/**
 * @private
 */
export function updateCollection(id, metas, options = {}) {
  if (!id) {
    throw new Error("A collection id is required.");
  }
  if (typeof metas !== "object") {
    throw new Error("A metas object is required.");
  }
  const { bucket, headers, permissions, data, schema, safe } = {
    ...requestDefaults,
    ...options
  };
  const requestData = {...data, ...metas};
  if (options.schema) {
    requestData.schema = schema;
  }
  return handleCacheHeaders(safe, {
    method: "PUT",
    path: endpoint("collection", bucket, id),
    headers,
    body: {
      data: requestData,
      permissions
    }
  });
}

/**
 * @private
 */
export function deleteCollection(collName, options = {}) {
  const { bucket, headers, safe } = {
    ...requestDefaults,
    ...options
  };
  return handleCacheHeaders(safe, {
    method: "DELETE",
    path: endpoint("collection", bucket, collName),
    headers,
    body: {}
  });
}

/**
 * @private
 */
export function updateBucket(id, metas, options = {}) {
  if (!id) {
    throw new Error("A bucket id is required.");
  }
  if (typeof metas !== "object") {
    throw new Error("A metas object is required.");
  }
  const { headers, permissions, safe } = {
    ...requestDefaults,
    ...options
  };
  return handleCacheHeaders(safe, {
    method: "PUT",
    path: endpoint("bucket", id),
    headers,
    body: {
      data: metas,
      permissions
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
  const { bucket, headers, permissions, safe } = {
    ...requestDefaults,
    ...options
  };
  return handleCacheHeaders(safe, {
    method: "PUT",
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
export function deleteRecord(collName, id, options = {}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  if (!id) {
    throw new Error("A record id is required.");
  }
  const { bucket, headers, safe } = {...requestDefaults, ...options};
  return handleCacheHeaders(safe, {
    method: "DELETE",
    path: endpoint("record", bucket, collName, id),
    headers,
    body: {
      data: {last_modified: options.lastModified}
    }
  });
}
