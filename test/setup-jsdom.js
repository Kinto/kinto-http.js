const jsdom = require("jsdom");

// Setup the jsdom environment
// @see https://github.com/facebook/react/issues/5046
global.document = jsdom.jsdom("<!doctype html><html><body></body></html>");
global.window = document.defaultView;
global.navigator = global.window.navigator;

// Expose a global fetch polyfill
global.fetch = global.window.fetch = require("isomorphic-fetch");

// jsdom FormData & Blob implementations are inconsistent, exposing better ones
global.FormData = require("form-data");
global.Blob = (sequences) => Buffer.from(sequences[0]);

// btoa polyfill for tests
global.btoa = require("btoa");
global.atob = require("atob");

