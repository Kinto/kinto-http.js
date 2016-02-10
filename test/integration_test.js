"use strict";

import btoa from "btoa";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import Api from "../src";
import { EventEmitter } from "events";
import KintoServer from "./server_utils";

chai.use(chaiAsPromised);
chai.should();
chai.config.includeStack = true;

const TEST_KINTO_SERVER = "http://0.0.0.0:8888/v1";

describe("Integration tests", () => {
  let sandbox, server, api;

  before(() => server = new KintoServer(TEST_KINTO_SERVER));

  after(() => server.killAll());

  beforeEach(function() {
    this.timeout(12500);

    sandbox = sinon.sandbox.create();
    const events = new EventEmitter();
    api = new Api(TEST_KINTO_SERVER, {
      events,
      headers: {Authorization: "Basic " + btoa("user:pass")}
    });
  });

  afterEach(() => sandbox.restore());

  describe("Default server configuration", () => {
    before(() => server.start());

    after(() => server.stop());

    beforeEach(() => server.flush());

    describe("Settings", () => {
      it("should retrieve server settings", () => {
        return api.fetchServerSettings()
          .then(_ => api.serverSettings)
          .should.eventually.have.property("batch_max_requests").eql(25);
      });
    });
  });

  describe("Flushed server", function() {
    before(() => server.start());

    after(() => server.stop());

    beforeEach(() => server.flush());

    it("should reject calls when a server flush is detected", () => {
      return api.fetchChangesSince("default", "tasks", {lastModified: 1})
        .should.be.rejectedWith(Error, "Server has been flushed");
    });
  });

  describe("Backed off server", () => {
    const backoffSeconds = 10;
    before(() => server.start({CLIQUET_BACKOFF: backoffSeconds}));

    after(() => server.stop());

    beforeEach(() => server.flush());

    it("should appropriately populate the backoff property", () => {
      // Issuing a first api call to retrieve backoff information
      return api.fetchChangesSince("default", "tasks")
        .then(() => expect(Math.round(api.backoff / 1000)).eql(backoffSeconds));
    });
  });

  describe("Deprecated protocol version", () => {
    beforeEach(() => server.flush());

    describe("Soft EOL", () => {
      before(() => {
        const tomorrow = new Date(new Date().getTime() + 86400000).toJSON().slice(0, 10);
        return server.start({
          CLIQUET_EOS: tomorrow,
          CLIQUET_EOS_URL: "http://www.perdu.com",
          CLIQUET_EOS_MESSAGE: "Boom",
        });
      });

      after(() => server.stop());

      beforeEach(() => sandbox.stub(console, "warn"));

      it("should warn when the server sends a deprecation Alert header", () => {
        return api.fetchServerSettings()
          .then(_ => {
            sinon.assert.calledWithExactly(console.warn, "Boom", "http://www.perdu.com");
          });
      });
    });

    describe("Hard EOL", () => {
      before(() => {
        const lastWeek = new Date(new Date().getTime() - (7 * 86400000)).toJSON().slice(0, 10);
        return server.start({
          CLIQUET_EOS: lastWeek,
          CLIQUET_EOS_URL: "http://www.perdu.com",
          CLIQUET_EOS_MESSAGE: "Boom",
        });
      });

      after(() => server.stop());

      beforeEach(() => sandbox.stub(console, "warn"));

      it("should reject with a 410 Gone when hard EOL is received", () => {
        return api.fetchServerSettings()
          .should.be.rejectedWith(Error, /HTTP 410; Service deprecated/);
      });
    });
  });
});
