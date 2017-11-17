/*
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

"use strict";

import KintoClientBase from "../src/base";
import * as errors from "../src/errors";

const Cu = Components.utils;

Cu.import("resource://gre/modules/Timer.jsm");
Cu.importGlobalProperties(['fetch']);
const { EventEmitter } = Cu.import("resource://gre/modules/EventEmitter.jsm", {});

export default class KintoHttpClient extends KintoClientBase {
  constructor(remote, options={}) {
    const events = {};
    EventEmitter.decorate(events);
    super(remote, {events, ...options});
  }
}

KintoHttpClient.errors = errors;

// This fixes compatibility with CommonJS required by browserify.
// See http://stackoverflow.com/questions/33505992/babel-6-changes-how-it-exports-default/33683495#33683495
if (typeof module === "object") {
  module.exports = KintoHttpClient;
}
