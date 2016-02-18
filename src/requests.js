import endpoint from "./endpoint";
import { quote } from "./utils.js";


function getLastModified(request) {
  return request.body &&
         "data" in request.body &&
         request.body.data.last_modified;
}

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

export function createBucket(bucketName, options = {}) {
  if (!bucketName) {
    throw new Error("A bucket name is required.");
  }
  const { headers, permissions, safe } = {
    safe: false,
    headers: {},
    permissions: {},
    ...options
  };
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

export function createCollection(options = {}) {
  const { bucket, headers, permissions, data, safe, id } = {
    safe: false,
    headers: {},
    permissions: {},
    bucket: "default",
    data: {},
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

export function createRecord(collName, record, options = {}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  const { bucket, headers, permissions, safe } = {
    safe: false,
    headers: {},
    bucket: "default",
    permissions: {},
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

export function updateRecord(collName, record, options = {}) {
  if (!collName) {
    throw new Error("A collection name is required.");
  }
  const { bucket, headers, permissions, safe } = {
    safe: false,
    headers: {},
    bucket: "default",
    permissions: {},
    ...options
  };
  if (!record.id) {
    throw new Error("A record id is required.");
  }
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
