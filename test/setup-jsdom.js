const jsdom = require("jsdom");

// Setup the jsdom environment
// @see https://github.com/facebook/react/issues/5046
const JSDOM = new jsdom.JSDOM("<!doctype html><html><body></body></html>");
global.window = JSDOM.window;
global.document = window.document;
global.navigator = global.window.navigator;

// sinon uses type-detect which checks "instanceof HTMLElement"
global.HTMLElement = window.HTMLElement;

// Expose a global fetch polyfill
global.fetch = global.window.fetch = require("isomorphic-fetch");

// jsdom FormData & Blob implementations are inconsistent, exposing better ones
global.FormData = require("form-data");
function Blob(sequences) {
  return Buffer.from(sequences[0]);
}
global.Blob = Blob;

// atob & btoa polyfill for tests
global.atob = require("atob");
global.btoa = require("btoa");
