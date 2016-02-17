/**
 * Returns the specified string with double quotes.
 *
 * @param  {String} str  A string to quote.
 * @return {String}
 */
export function quote(str) {
  return `"${str}"`;
}

/**
 * Trim double quotes from specified string.
 *
 * @param  {String} str  A string to unquote.
 * @return {String}
 */
export function unquote(str) {
  return str.replace(/^"/, "").replace(/"$/, "");
}

/**
 * Chunks an array into n pieces.
 *
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
