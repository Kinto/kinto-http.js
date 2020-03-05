import KintoClientBase, { KintoClientOptions } from "./base";
import { AggregateResponse } from "./batch";
import type Collection from "./collection";
import { KintoObject, KintoIdObject, KintoResponse, Permission } from "./types";

export default class KintoClient extends KintoClientBase {
  constructor(remote: string, options: Partial<KintoClientOptions> = {}) {
    const events = options.events;

    super(remote, Object.assign({ events }, options));
  }
}

export {
  KintoObject,
  KintoIdObject,
  Collection,
  AggregateResponse,
  KintoResponse,
  Permission,
};
