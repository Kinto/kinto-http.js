import { EventEmitter } from "events";

import KintoClientBase, { KintoClientOptions } from "./base";
import { AggregateResponse } from "./batch";
import Collection from "./collection";
import { KintoObject, KintoIdObject, KintoResponse, Permission } from "./types";

export default class KintoClient extends KintoClientBase {
  constructor(remote: string, options: Partial<KintoClientOptions> = {}) {
    const events = options.events || new EventEmitter();

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
