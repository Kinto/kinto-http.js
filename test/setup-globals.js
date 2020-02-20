const fetch = require("node-fetch");

// Expose a global fetch polyfill
global.fetch = fetch;
global.Headers = fetch.Headers;

// jsdom FormData implementation is inconsistent, exposing a better one
global.FormData = require("form-data");

// atob polyfill for tests
global.atob = require("atob");
