"use strict";

import { EventEmitter } from "events";

import KintoClientBase, { KintoClientOptions } from "./base";

export default class KintoClient extends KintoClientBase {
  constructor(remote: string, options: Partial<KintoClientOptions> = {}) {
    const events = options.events || new EventEmitter();

    super(remote, Object.assign({ events }, options));
  }
}
