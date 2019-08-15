export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface KintoRequest {
  method?: HttpMethod;
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

interface User {
  id: string;
  principals: string[];
  bucket: string;
}

interface ServerCapability {
  description: string;
  url: string;
}

interface ServerSettings {
  readonly: boolean;
  batch_max_requests: number;
}

export interface HelloResponse {
  project_name: string;
  project_version: string;
  http_api_version: string;
  project_docs: string;
  url: string;
  settings: ServerSettings;
  user?: User;
  capabilities: { [key: string]: ServerCapability };
}

export interface OperationResponse {
  status: number;
  path: string;
  body: { data: KintoRecord };
  headers: Record<string, string>;
}

export interface BatchResponse {
  responses: OperationResponse[];
}

export interface DataResponse<T> {
  data: T;
}
