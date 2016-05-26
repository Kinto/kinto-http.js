/**
 * Endpoints templates.
 * @type {Object}
 */
const ENDPOINTS = {
  root:                   () => "/",
  batch:                  () => "/batch",
  bucket:           (bucket) => "/buckets" + (bucket ? `/${bucket}` : ""),
  collection: (bucket, coll) => `${ENDPOINTS.bucket(bucket)}/collections` + (coll ? `/${coll}` : ""),
  group:     (bucket, group) => `${ENDPOINTS.bucket(bucket)}/groups` + (group ? `/${group}` : ""),
  record: (bucket, coll, id) => `${ENDPOINTS.collection(bucket, coll)}/records` + (id ? `/${id}` : ""),
};

/**
 * Retrieves a server enpoint by its name.
 *
 * @private
 * @param  {String}    name The endpoint name.
 * @param  {...string} args The endpoint parameters.
 * @return {String}
 */
export default function endpoint(name, ...args) {
  return ENDPOINTS[name](...args);
}
