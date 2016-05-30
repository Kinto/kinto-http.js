/**
 * Chunks an array into n pieces.
 *
 * @private
 * @param  {Array}  array
 * @param  {Number} n
 * @return {Array}
 */
export function partition(array, n) {
  if (n <= 0) {
    return array;
  }
  return array.reduce((acc, x, i) => {
    if (i === 0 || i % n === 0) {
      acc.push([x]);
    } else {
      acc[acc.length - 1].push(x);
    }
    return acc;
  }, []);
}

/**
 * Maps a list to promises using the provided mapping function, executes them
 * sequentially then returns a Promise resolving with ordered results obtained.
 * Think of this as a sequential Promise.all.
 *
 * @private
 * @param  {Array}    list The list to map.
 * @param  {Function} fn   The mapping function.
 * @return {Promise}
 */
export function pMap(list, fn) {
  let results = [];
  return list.reduce((promise, entry) => {
    return promise.then(() => {
      return Promise.resolve(fn(entry))
        .then(result => results = results.concat(result));
    });
  }, Promise.resolve()).then(() => results);
}

/**
 * Takes an object and returns a copy of it with the provided keys omitted.
 *
 * @private
 * @param  {Object}    obj  The source object.
 * @param  {...String} keys The keys to omit.
 * @return {Object}
 */
export function omit(obj, ...keys) {
  return Object.keys(obj).reduce((acc, key) => {
    if (keys.indexOf(key) === -1) {
      acc[key] = obj[key];
    }
    return acc;
  }, {});
}

/**
 * Always returns a resource data object from the provided argument.
 *
 * @private
 * @param  {Object|String} resource
 * @return {Object}
 */
export function toDataBody(resource) {
  if (typeof resource === "object") {
    return resource;
  }
  if (typeof resource === "string") {
    return {id: resource};
  }
  throw new Error("Invalid argument.");
}

/**
 * Transforms an object into an URL query string, stripping out any undefined
 * values.
 *
 * @param  {Object} obj
 * @return {String}
 */
export function qsify(obj) {
  const sep = "&";
  const encode = (v) => encodeURIComponent(typeof v === "boolean" ? String(v) : v);
  const stripUndefined = (o) => JSON.parse(JSON.stringify(o));
  const stripped = stripUndefined(obj);
  return Object.keys(stripped).map((k) => {
    const ks = encode(k) + "=";
    if (Array.isArray(stripped[k])) {
      return stripped[k].map((v) => ks + encode(v)).join(sep);
    } else {
      return ks + encode(stripped[k]);
    }
  }).join(sep);
}

/**
 * Checks if a version is within the provided range.
 *
 * @param  {String} version    The version to check.
 * @param  {String} minVersion The minimum supported version (inclusive).
 * @param  {String} maxVersion The minimum supported version (exclusive).
 * @throws {Error} If the version is outside of the provided range.
 */
export function checkVersion(version, minVersion, maxVersion) {
  const extract = (str) => str.split(".").map(x => parseInt(x, 10));
  const [verMajor, verMinor] = extract(version);
  const [minMajor, minMinor] = extract(minVersion);
  const [maxMajor, maxMinor] = extract(maxVersion);
  const checks = [
    verMajor < minMajor,
    verMajor === minMajor && verMinor < minMinor,
    verMajor > maxMajor,
    verMajor === maxMajor && verMinor >= maxMinor,
  ];
  if (checks.some(x => x)) {
    throw new Error(`Version ${version} doesn't satisfy ` +
                    `${minVersion} <= x < ${maxVersion}`);
  }
}

/**
 * Generates a decorator function ensuring a version check is performed against
 * the provided requirements before executing it.
 *
 * @param  {String} min The required min version (inclusive).
 * @param  {String} max The required max version (inclusive).
 * @return {Function}
 */
export function support(min, max) {
  return function(target, key, descriptor) {
    const fn = descriptor.value;
    return {
      configurable: true,
      get() {
        const wrappedMethod = (...args) => {
          // "this" is the current instance which its method is decorated.
          const client = "client" in this ? this.client : this;
          return client.fetchHTTPApiVersion()
            .then(version => checkVersion(version, min, max))
            .then(Promise.resolve(fn.apply(this, args)));
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true
        });
        return wrappedMethod;
      }
    };
  };
}

/**
 * Generates a decorator function ensuring an operation is not performed from
 * within a batch request.
 *
 * @param  {String} message The error message to throw.
 * @return {Function}
 */
export function nobatch(message) {
  return function(target, key, descriptor) {
    const fn = descriptor.value;
    return {
      configurable: true,
      get() {
        const wrappedMethod = (...args) => {
          // "this" is the current instance which its method is decorated.
          if (this._isBatch) {
            throw new Error(message);
          }
          return fn.apply(this, args);
        };
        Object.defineProperty(this, key, {
          value: wrappedMethod,
          configurable: true,
          writable: true
        });
        return wrappedMethod;
      }
    };
  };
}

export function removeUndefined(obj) {
  return JSON.parse(JSON.stringify(obj));
}
