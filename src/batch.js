import * as requests from "./requests";


/**
 * Call a request function extending its options argument with the provided one.
 *
 * @private
 * @param  {Function} requestFn The function.
 * @param  {Array}    args      The function arguments.
 * @param  {Object}   options   The options object.
 * @return {Any}
 */
function callWithOptions(requestFn, args, options) {
  let newArgs;
  // Function.length doesn't count default arguments, so we're sure if we have
  // a supplementary object arg, it's our request options object.
  if (args.length === requestFn.length + 1 &&
      typeof args[args.length - 1] === "object") {
    newArgs = args.slice(0, args.length - 1)
      .concat({...options, ...args[args.length - 1]});
  } else {
    // No options arg, we create one for this call
    newArgs = args.concat(options);
  }
  return requestFn(...newArgs);
}

/**
 * Creates a batch object, basically a proxy for creating request objects and
 * stacking them up in a `requests` properties.
 *
 * Options:
 * - {Object}  headers    The headers to attach to each subrequest.
 * - {Boolean} safe       Safe modifications (default: `false`).
 * - {String}  bucket     Generic bucket to use (default: `"default"`).
 * - {String}  collection Generic collection to use (default: `undefined`).
 *
 * @private
 * @param  {Object} options The options object.
 * @return {Object}
 */
export function createBatch(options={}) {
  const { safe, bucket, headers, collection } = {
    safe: false,
    headers: {},
    bucket: "default",
    ...options
  };
  const batch = {requests: []};
  for (const method in requests) {
    batch[method] = function(...args) {
      const reqOptions = {safe, bucket, headers, collection};
      const reqArgs = collection && method.endsWith("Record") ?
                      [collection].concat(args) : args;
      const request = callWithOptions(requests[method], reqArgs, reqOptions);
      batch.requests.push({
        ...request,
        headers: {
          ...headers,
          ...request.headers
        }
      });
    };
  }
  return batch;
}

/**
 * Exports batch responses as a result object.
 *
 * @private
 * @param  {Array} responses The batch subrequest responses.
 * @param  {Array} requests  The initial issued requests.
 * @return {Object}
 */
export function aggregate(responses=[], requests=[]) {
  if (responses.length !== requests.length) {
    throw new Error("Responses length should match requests one.");
  }
  const results = {
    errors:    [],
    published: [],
    conflicts: [],
    skipped:   [],
  };
  return responses.reduce((acc, response, index) => {
    const {status} = response;
    if (status >= 200 && status < 400) {
      acc.published.push(response.body);
    } else if (status === 404) {
      acc.skipped.push(response.body);
    } else if (status === 412) {
      acc.conflicts.push({
        // XXX: specifying the type is probably superfluous
        type: "outgoing",
        local: requests[index].body,
        remote: response.body.details &&
                response.body.details.existing || null
      });
    } else {
      acc.errors.push({
        path: response.path,
        sent: requests[index],
        error: response.body
      });
    }
    return acc;
  }, results);
}
