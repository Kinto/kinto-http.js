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

export function createCollection(collName, options = {}) {
  const { bucket, headers, permissions, data, safe } = {
    safe: false,
    headers: {},
    permissions: {},
    bucket: "default",
    data: {},
    ...options
  };
  return handleCacheHeaders(safe, {
    method: "PUT",
    path: endpoint("collection", bucket, collName),
    headers,
    body: {data, permissions}
  });
}

export function createRecord(collName, record, options = {}) {
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
