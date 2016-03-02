/**
 * Endpoints templates.
 * @type {Object}
 */
const ENDPOINTS = {
  root:                   () => "/",
  batch:                  () => "/batch",
  buckets:                () => "/buckets",
  bucket:           (bucket) => `/buckets/${bucket}`,
  collections:      (bucket) => `${ENDPOINTS.bucket(bucket)}/collections`,
  collection: (bucket, coll) => `${ENDPOINTS.bucket(bucket)}/collections/${coll}`,
  records:    (bucket, coll) => `${ENDPOINTS.collection(bucket, coll)}/records`,
  record: (bucket, coll, id) => `${ENDPOINTS.records(bucket, coll)}/${id}`,
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
