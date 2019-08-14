export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface KintoRequest {
  method: HttpMethod;
  path: string;
  headers: HeadersInit;
  body?: any;
}

export interface KintoIdRecord {
  id: string;
  [key: string]: any;
}

export interface KintoRecord extends KintoIdRecord {
  last_modified: number;
}

export type Permission =
  | "bucket:create"
  | "read"
  | "write"
  | "collection:create"
  | "group:create"
  | "record:create";
