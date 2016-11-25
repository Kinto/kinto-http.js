import { omit, createFormData } from "./utils";
import { KintoRequestOptions, KintoRecord, KintoPermissions } from "./interfaces"


const requestDefaults = {
  safe: false,
  // check if we should set default content type here
  headers: {},
  permissions: undefined,
  data: undefined,
  patch: false,
};

/**
 * @private
 */
function safeHeader(safe: boolean, last_modified: number = undefined): Object {
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
export function createRequest(path: string, {data, permissions}:{data?: KintoRecord,permissions?: KintoPermissions}, options: KintoRequestOptions={}) {
  const { headers, safe } = {
    ...requestDefaults,
    ...options,
  } as KintoRequestOptions;
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
export function updateRequest(path: string, {data, permissions}:{data?: KintoRecord,permissions?: KintoPermissions}, options: KintoRequestOptions={}) {
  const {
    headers,
    safe,
    patch,
  } = {...requestDefaults, ...options} as KintoRequestOptions;
  const { last_modified } = { ...data, ...options } as any;

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
export function deleteRequest(path: string, options: KintoRequestOptions={}) {
  const {headers, safe, last_modified} = {
    ...requestDefaults,
    ...options
  } as KintoRequestOptions;
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
export function addAttachmentRequest(path: string, dataURI, {data, permissions}:{data?: KintoRecord,permissions?: KintoPermissions}={}, options: KintoRequestOptions={}) {
  const {headers, safe} = {...requestDefaults, ...options} as KintoRequestOptions;
  const {last_modified} = {...data, ...options } as KintoRequestOptions;

  const body = {data, permissions};
  const formData = createFormData(dataURI, body, options);

  return {
    method: "POST",
    path,
    headers: {
      ...headers,
      ...safeHeader(safe, last_modified),
    },
    body: formData
  };
}
