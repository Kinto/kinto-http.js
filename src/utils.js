import { stringify as toQuerystring } from "querystring";

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
 * @param  {Object|String} value
 * @return {Object}
 */
export function toDataBody(value) {
  if (typeof value === "object") {
    return value;
  }
  if (typeof value === "string") {
    return {id: value};
  }
  throw new Error("Invalid collection argument.");
}

/**
 * Transforms an object into an URL query string, stripping out any undefined
 * values.
 *
 * @param  {Object} obj
 * @return {String}
 */
export function qsify(obj) {
  return toQuerystring(JSON.parse(JSON.stringify(obj)));
}

/**
 * Checks if a version is within the provided range.
 *
 * @param  {String} version The version to check.
 * @param  {String} min     The minimum version (inclusive).
 * @param  {String} max     The minimum version (exclusive).
 * @throws {Error} If the version is outside of the provided range.
 */
export function checkVersion(version, min, max) {
  function extract(str) {
    return str.split(".").map(x => parseInt(x, 10));
  }

  const [verMajor, verMinor] = extract(version);
  const [minMajor, minMinor] = extract(min);
  const [maxMajor, maxMinor] = extract(max);

  const msg = `Version ${version} doesn't match ${min} <= x < ${max}`;

  if (verMajor < minMajor) {
    throw new Error(msg);
  }
  if (verMajor === minMajor) {
    if (verMinor < minMinor) {
      throw new Error(msg);
    }
  }
  if (verMajor >= maxMajor) {
    if (verMajor > maxMajor) {
      throw new Error(msg);
    }
    if (verMinor >= maxMinor) {
      throw new Error(msg);
    }
  }
}
