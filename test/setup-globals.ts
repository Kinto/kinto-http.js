import fetch, { Headers } from "node-fetch";
import Blob from "../blob";

// Expose a global fetch polyfill
(global as any).fetch = fetch;
(global as any).Headers = Headers;

(global as any).FormData = require("form-data");

// atob polyfill for tests
(global as any).atob = require("atob");

(global as any).Blob = Blob;
