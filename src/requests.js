import { omit } from "./utils";

const requestDefaults = {
  safe: false,
  // check if we should set default content type here
  headers: {},
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

/**
 * @private
 */
export function createRequest(path, {data, permissions}, options={}) {
  const { headers, safe } = {
    ...requestDefaults,
    ...options,
  };
  return {
    method: data && data.id ? "PUT" : "POST",
    path,
    headers: {...headers, ...safeHeader(safe)},
    body: {
      data,
      permissions
    }
  };
}

/**
 * @private
 */
export function updateRequest(path, {data, permissions}, options={}) {
  const {
    headers,
    safe,
    patch,
  } = {...requestDefaults, ...options};
  const { last_modified } = { ...data, ...options };

  if (Object.keys(omit(data, "id", "last_modified")).length === 0) {
    data = undefined;
  }

  return {
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
  };
}

/**
 * @private
 */
export function deleteRequest(path, options={}) {
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
export function getGroup(id, options={}) {
  const { bucket, headers } = {
    ...requestDefaults,
    ...options
  };
  const path = endpoint("group", bucket, id);
  return {
    method: "GET",
    path,
    headers: {...headers}
  };
}

/**
 * @private
 */
export function createGroup({data, permissions}, options={}) {
  if (typeof data !== "object") {
    throw new Error("A group object is required.");
  }
  const { bucket, headers, safe } = {
    ...requestDefaults,
    ...options
  };
  const path = data.id ? endpoint("group", bucket, data.id) :
                         endpoint("groups", bucket);
  return {
    method: data.id ? "PUT" : "POST",
    path,
    headers: {...headers, ...safeHeader(safe)},
    body: {
      data,
      permissions
    }
  };
}

/**
 * @private
 */
export function updateGroup({data, permissions}, options={}) {
  if (typeof data !== "object") {
    throw new Error("A group object is required.");
  }
  if (!data.id) {
    throw new Error("A group id is required.");
  }
  const { bucket, headers, safe, patch, last_modified } = {
    ...requestDefaults,
    ...options
  };
  return {
    method: patch ? "PATCH" : "PUT",
    path: endpoint("group", bucket, data.id),
    headers: {
      ...headers,
      ...safeHeader(safe, last_modified || data.last_modified)
    },
    body: {
      data,
      permissions
    }
  };
}

/**
 * @private
 */
export function deleteGroup(group, options={}) {
  if (typeof group !== "object") {
    throw new Error("A group object is required.");
  }
  if (!group.id) {
    throw new Error("A group id is required.");
  }
  const { bucket, headers, safe, last_modified } = {
    ...requestDefaults,
    last_modified: group.last_modified,
    ...options
  };
  if (safe && !last_modified) {
    throw new Error("Safe concurrency check requires a last_modified value.");
  }
  return {
    method: "DELETE",
    path: endpoint("group", bucket, group.id),
    headers: {...headers, ...safeHeader(safe, last_modified)}
  };
}
