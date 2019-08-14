"use strict";

export function fakeServerResponse(
  status: number,
  json: any,
  headers: { [key: string]: string | number } = {}
) {
  return Promise.resolve({
    status: status,
    headers: {
      get(name: string) {
        if (!("Content-Length" in headers) && name === "Content-Length") {
          return JSON.stringify(json).length;
        }
        return headers[name];
      },
    },
    text() {
      return Promise.resolve(JSON.stringify(json));
    },
  });
}

export function delayedPromise(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}
