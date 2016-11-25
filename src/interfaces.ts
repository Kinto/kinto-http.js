import { EventEmitter } from "events";

export interface KintoClientOptions extends KintoRequestOptions {
  /* The remote URL. */
  remote?: string;

  /* The events handler instance. */
  events?: EventEmitter;
}

export interface KintoRequestOptions extends KintoHTTPOptions {
  /* Adds concurrency headers to every requests. */
  safe?: boolean;
  
  /* The default bucket to use. */
  bucket?: string;

  /* The default collection to use. */
  collection?: string;

  permissions?: KintoPermissions;
  data?: KintoRecord;
  filters?;
  last_modified? : number;
  patch?: boolean;
  batch?: boolean;
  aggregate?: boolean;
}

export interface KintoHTTPOptions {
  /* The HTTP request mode (from ES6 fetch spec). */
  requestMode?: string;

  /* The requests timeout in ms. */
  timeout?: number;

  /* The key-value headers to pass to each request. */
  headers?: Object;

  body?;
  mode?;
}

export interface KintoListOptions {
  /* The order field (default: -last_modified). */
  sort?: string;

  /* The number of result pages to retrieve (default: 1). */
  pages?: number;

  /* The number of records to retrieve per page: unset by default, uses default server configuration. */
  limit?: number;

  /* An object defining the filters to apply; read more about what's supported: http://kinto.readthedocs.io/en/stable/api/1.x/filtering.html */
  filters?: Object;

  /* The ETag header value received from the last response from the server. */
  since?: string;
}

export interface KintoServerInformation {
  project_name: string;
  project_version: string;
  url: URL;
  project_docs: URL;
  http_api_version: string;
  settings: {
      batch_max_requests: number;
      readonly: boolean;
  };
  user?: {
      bucket: string,
      id: string
  },
  capabilities: {
      default_bucket: {
          description: string;
          url: URL
      }
      [propName: string]: any;
  }
}

export interface KintoPermissions {
  read?: string[];
  write?: string[];
  create?: string[];
}

export interface KintoRecord {
  id?: string;
  last_modified?: number;
  [propName: string]: any;
}

export interface KintoGroup {
  data: {
    id?: string;
    last_modified?: number;
    members: string[];
  }
  permissions: KintoPermissions;
}