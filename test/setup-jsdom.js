const jsdom = require("jsdom");

// Setup the jsdom environment
// @see https://github.com/facebook/react/issues/5046
global.document = jsdom.jsdom("<!doctype html><html><body></body></html>");
global.window = document.defaultView;
global.navigator = global.window.navigator;
global.Blob = global.window.Blob;
global.FormData = global.window.FormData;

// btoa polyfill for tests
global.btoa = require("btoa");
global.atob = require("atob");


global.FormData = require("form-data");
global.Blob = function(sequences) { return Buffer.from(sequences[0]); };
