export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface KintoRequest {
  method: HttpMethod;
  path: string;
  headers: HeadersInit;
  body?: any;
}

export interface KintoRecord {
  id: string;
  last_modified: number;
  [key: string]: any;
}