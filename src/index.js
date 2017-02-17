import { EventEmitter } from "events";
import KintoClientBase from "./base";

export default class KintoClient extends KintoClientBase {
  constructor(remote, options={}) {
    const events = options.events || new EventEmitter();

    super(remote, Object.assign({events}, options));
  }
}
