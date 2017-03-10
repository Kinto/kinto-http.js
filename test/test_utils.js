"use strict";

export function fakeServerResponse(status, json, headers = {}) {
  return Promise.resolve({
    status: status,
    headers: {
      get(name) {
        if (!("Content-Length" in headers) && name === "Content-Length") {
          return JSON.stringify(json).length;
        }
        return headers[name];
      },
    },
    text() {
      return JSON.stringify(json);
    },
  });
}

export function delayedPromise(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}
