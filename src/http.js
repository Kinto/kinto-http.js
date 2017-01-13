"use strict";

import ERROR_CODES from "./errors";

/**
 * Enhanced HTTP client for the Kinto protocol.
 * @private
 */
export default class HTTP {
  /**
   * Default HTTP request headers applied to each outgoing request.
   *
   * @type {Object}
   */
  static get DEFAULT_REQUEST_HEADERS() {
    return {
      "Accept":       "application/json",
      "Content-Type": "application/json",
    };
  }

  /**
   * Default options.
   *
   * @type {Object}
   */
  static get defaultOptions() {
    return {timeout: 5000, requestMode: "cors"};
  }

  /**
   * Constructor.
   *
   * @param {EventEmitter} events                       The event handler.
   * @param {Object}       [options={}}                 The options object.
   * @param {Number}       [options.timeout=5000]       The request timeout in ms (default: `5000`).
   * @param {String}       [options.requestMode="cors"] The HTTP request mode (default: `"cors"`).
   */
  constructor(events, options={}) {
    // public properties
    /**
     * The event emitter instance.
     * @type {EventEmitter}
     */
    if (!events) {
      throw new Error("No events handler provided");
    }
    this.events = events;

    /**
     * The request mode.
     * @see  https://fetch.spec.whatwg.org/#requestmode
     * @type {String}
     */
    this.requestMode = options.requestMode || HTTP.defaultOptions.requestMode;

    /**
     * The request timeout.
     * @type {Number}
     */
    this.timeout = options.timeout || HTTP.defaultOptions.timeout;
  }

  /**
   * Performs an HTTP request to the Kinto server.
   *
   * Resolves with an objet containing the following HTTP response properties:
   * - `{Number}  status`  The HTTP status code.
   * - `{Object}  json`    The JSON response body.
   * - `{Headers} headers` The response headers object; see the ES6 fetch() spec.
   *
   * @param  {String} url               The URL.
   * @param  {Object} [options={}]      The fetch() options object.
   * @param  {Object} [options.headers] The request headers object (default: {})
   * @param  {Object} [options.retry]   Number of retries (default: 1)
   * @return {Promise}
   */
  request(url, options={headers:{}, retry: 1}) {
    let response, status, statusText, headers, hasTimedout;
    // Ensure default request headers are always set
    options.headers = {...HTTP.DEFAULT_REQUEST_HEADERS, ...options.headers};
    // If a multipart body is provided, remove any custom Content-Type header as
    // the fetch() implementation will add the correct one for us.
    if (options.body && typeof options.body.append === "function") {
      delete options.headers["Content-Type"];
    }
    options.mode = this.requestMode;
    return new Promise((resolve, reject) => {
      // Detect if a request has timed out.
      const _timeoutId = setTimeout(() => {
        hasTimedout = true;
        reject(new Error("Request timeout."));
      }, this.timeout);

      fetch(url, options).then(res => {
        if (!hasTimedout) {
          clearTimeout(_timeoutId);
          resolve(res);
        }
      }).catch(err => {
        if (!hasTimedout) {
          clearTimeout(_timeoutId);
          reject(err);
        }
      });
    })
      .then(res => {
        response = res;
        headers = res.headers;
        status = res.status;
        statusText = res.statusText;
        this._checkForDeprecationHeader(headers);
        this._checkForBackoffHeader(status, headers);

        // Check if the server summons the client to retry after a while.
        const retryAfter = this._checkForRetryAfterHeader(status, headers);
        // If number of allowed of retries is not exhausted, retry the same request.
        if (retryAfter && options.retry > 0) {
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve(this.request(url, {...options, retry: options.retry - 1}));
            }, retryAfter);
          });
        }

        return Promise.resolve(res.text())
          // Check if we have a body; if so parse it as JSON.
          .then(text => {
            if (text.length === 0) {
              return null;
            }
            // Note: we can't consume the response body twice.
            return JSON.parse(text);
          })
          .catch(err => {
            const error = new Error(`HTTP ${status || 0}; ${err}`);
            error.response = response;
            error.stack = err.stack;
            throw error;
          })
          .then(json => {
            if (json && status >= 400) {
              let message = `HTTP ${status} ${json.error||""}: `;
              if (json.errno && json.errno in ERROR_CODES) {
                const errnoMsg = ERROR_CODES[json.errno];
                message += errnoMsg;
                if (json.message && json.message !== errnoMsg) {
                  message += ` (${json.message})`;
                }
              } else {
                message += statusText || "";
              }
              const error = new Error(message.trim());
              error.response = response;
              error.data = json;
              throw error;
            }
            return {status, json, headers};
          });
      });
  }

  _checkForDeprecationHeader(headers) {
    const alertHeader = headers.get("Alert");
    if (!alertHeader) {
      return;
    }
    let alert;
    try {
      alert = JSON.parse(alertHeader);
    } catch(err) {
      console.warn("Unable to parse Alert header message", alertHeader);
      return;
    }
    console.warn(alert.message, alert.url);
    this.events.emit("deprecated", alert);
  }

  _checkForBackoffHeader(status, headers) {
    let backoffMs;
    const backoffSeconds = parseInt(headers.get("Backoff"), 10);
    if (backoffSeconds > 0) {
      backoffMs = (new Date().getTime()) + (backoffSeconds * 1000);
    } else {
      backoffMs = 0;
    }
    this.events.emit("backoff", backoffMs);
  }

  _checkForRetryAfterHeader(status, headers) {
    let retryAfter = headers.get("Retry-After");
    if (!retryAfter) {
      return;
    }
    const delay = parseInt(retryAfter, 10) * 1000;
    retryAfter = (new Date().getTime()) + delay;
    this.events.emit("retry-after", retryAfter);
    return delay;
  }
}
