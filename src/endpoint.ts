/**
 * Collection endpoints templates.
 * @type {Object}
 */
export const COLLECTION_ENDPOINTS = {
  collection: (bucket: string, coll?: string) =>
    `${ENDPOINTS.bucket(bucket)}/collections` + (coll ? `/${coll}` : ""),
  record: (bucket: string, coll: string, id?: string) =>
    `${ENDPOINTS.collection(bucket, coll)}/records` + (id ? `/${id}` : ""),
  attachment: (bucket: string, coll: string, id: string) =>
    `${ENDPOINTS.record(bucket, coll, id)}/attachment`,
};

/**
 * Bucket endpoints templates.
 * @type {Object}
 */
export const BUCKET_ENDPOINTS = {
  bucket: (bucket?: string) => "/buckets" + (bucket ? `/${bucket}` : ""),
  history: (bucket: string) => `${ENDPOINTS.bucket(bucket)}/history`,
  group: (bucket: string, group?: string) =>
    `${ENDPOINTS.bucket(bucket)}/groups` + (group ? `/${group}` : ""),
  ...COLLECTION_ENDPOINTS,
};

/**
 * Endpoints templates.
 * @type {Object}
 */
const ENDPOINTS = {
  root: () => "/",
  batch: () => "/batch",
  permissions: () => "/permissions",
  ...BUCKET_ENDPOINTS,
};

export default ENDPOINTS;

/**
 * Retrieves a server endpoint template by its name.
 *
 * @private
 * @param  {String}   name The endpoint name.
 * @return {Function}
 */
export function get(name: keyof typeof ENDPOINTS): Function {
  return ENDPOINTS[name];
}
