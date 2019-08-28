export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD";

export interface KintoRequest {
  method?: HttpMethod;
  path: string;
  headers: HeadersInit;
  body?: any;
}

export interface KintoIdObject {
  id: string;
  [key: string]: any;
}

export interface KintoRecord extends KintoIdObject {
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
  version?: string;
  [key: string]: unknown;
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

export type MappableObject = { [key in string | number]: unknown };

export interface KintoEntity {
  data: KintoRecord;
  permissions: Record<Permission, string[]>;
}

export interface HistoryEntry {
  action: string;
  collection_id: string;
  date: string;
  id: string;
  last_modified: number;
  record_id: string;
  resource_name: string;
  target: KintoEntity;
  timestamp: number;
  uri: string;
  user_id: string;
}
