/**
 * Kinto server error code descriptors.
 * @type {Object}
 */
const ERROR_CODES = {
  104: "Missing Authorization Token",
  105: "Invalid Authorization Token",
  106: "Request body was not valid JSON",
  107: "Invalid request parameter",
  108: "Missing request parameter",
  109: "Invalid posted data",
  110: "Invalid Token / id",
  111: "Missing Token / id",
  112: "Content-Length header was not provided",
  113: "Request body too large",
  114: "Resource was created, updated or deleted meanwhile",
  115: "Method not allowed on this end point (hint: server may be readonly)",
  116: "Requested version not available on this server",
  117: "Client has sent too many requests",
  121: "Resource access is forbidden for this user",
  122: "Another resource violates constraint",
  201: "Service Temporary unavailable due to high load",
  202: "Service deprecated",
  999: "Internal Server Error",
};

export default ERROR_CODES;

class NetworkTimeoutError extends Error {
  constructor(url, options, ...params) {
    super(...params);

    Error.captureStackTrace(this, NetworkTimeoutError);

    this.url = url;
    this.options = options;
  }
}

class UnparseableResponseError extends Error {
  constructor(response, body, error) {
    const { status } = response;

    super(
      `Response from server unparseable (HTTP ${status || 0}; ${error}): ${
        body
      }`
    );
    Error.captureStackTrace(this, UnparseableResponseError);

    this.status = status;
    this.response = response;
    this.stack = error.stack;
    this.error = error;
  }
}

/**
 * "Error" subclass representing a >=400 response from the server.
 *
 * Whether or not this is an error depends on your application.
 *
 * The `json` field can be undefined if the server responded with an
 * empty response body. This shouldn't generally happen. Most "bad"
 * responses come with a JSON error description, or (if they're
 * fronted by a CDN or nginx or something) occasionally non-JSON
 * responses (which become UnparseableResponseErrors, above).
 */
class ServerResponse extends Error {
  constructor(response, json) {
    const { status, statusText } = response;
    let message = `HTTP ${status} ${(json && json.error) || ""}: `;
    if (json && json.errno && json.errno in ERROR_CODES) {
      const errnoMsg = ERROR_CODES[json.errno];
      message += errnoMsg;
      if (json.message && json.message !== errnoMsg) {
        message += ` (${json.message})`;
      }
    } else {
      message += statusText || "";
    }

    super(message.trim());
    Error.captureStackTrace(this, ServerResponse);

    this.response = response;
    this.data = json;
  }
}

export { NetworkTimeoutError, ServerResponse, UnparseableResponseError };
