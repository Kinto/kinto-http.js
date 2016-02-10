"use strict";

import btoa from "btoa";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { v4 as uuid4 } from "uuid";

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

    describe("#createBucket", () => {
      let result;

      describe("Default options", () => {
        beforeEach(() => {
          return api.createBucket("foo")
            .then(res => result = res);
        });

        it("should create a bucket with the passed id", () => {
          expect(result).to.have.property("data")
                        .to.have.property("id").eql("foo");
        });

        it("should create a bucket having a list of write permissions", () => {
          expect(result).to.have.property("permissions")
                        .to.have.property("write").to.be.a("array");
        });
      });

      describe("permissions option", () => {
        beforeEach(() => {
          return api.createBucket("foo", {
            permissions: {
              read: ["github:n1k0"]
            }
          })
            .then(res => result = res);
        });

        it("should create a bucket having a list of write permissions", () => {
          expect(result).to.have.property("permissions")
                        .to.have.property("read").to.eql(["github:n1k0"]);
        });
      });
    });

    describe("#createCollection", () => {
      let result;

      describe("Default options", () => {
        beforeEach(() => {
          return api.createCollection("blog")
            .then(res => result = res);
        });

        it("should create a collection with the passed id", () => {
          expect(result).to.have.property("data")
                        .to.have.property("id").eql("blog");
        });

        it("should create a collection having a list of write permissions", () => {
          expect(result).to.have.property("permissions")
                        .to.have.property("write").to.be.a("array");
        });
      });

      describe("permissions option", () => {
        beforeEach(() => {
          return api.createCollection("blog", {
            permissions: {
              read: ["github:n1k0"]
            }
          })
            .then(res => result = res);
        });

        it("should create a collection having a list of write permissions", () => {
          expect(result).to.have.property("permissions")
                        .to.have.property("read").to.eql(["github:n1k0"]);
        });
      });

      describe("data option", () => {
        beforeEach(() => {
          return api.createCollection("blog", {
            data: {foo: "bar"}
          })
            .then(res => result = res);
        });

        it("should create a collection having the expected data attached", () => {
          expect(result).to.have.property("data")
                        .to.have.property("foo").eql("bar");
        });
      });
    });

    describe("#getRecords", function() {
      const fixtures = [
        {id: uuid4(), title: "art1"},
        {id: uuid4(), title: "art2"},
        {id: uuid4(), title: "art3"},
      ];

      describe("Default bucket", () => {
        beforeEach(() => api.batch("default", "blog", fixtures));

        it("should return every records", () => {
          return api.getRecords("blog")
            .then((res) => res.data.map((r) => r.title))
            .should.eventually.become(["art3", "art2", "art1"]);
        });

        it("should order records by field", () => {
          return api.getRecords("blog", {sort: "title"})
            .then((res) => res.data.map((r) => r.title))
            .should.eventually.become(["art1", "art2", "art3"]);
        });
      });

      describe("Custom bucket", () => {
        beforeEach(() => {
          return api.createBucket("custom")
          .then(api.createCollection("blog", {bucket: "custom"}))
          .then(_ => api.batch("custom", "blog", fixtures));
        });

        it("should accept a custom bucket option", () => {
          return api.getRecords("blog", {bucket: "custom"})
            .then((res) => res.data.map((r) => r.title))
            .should.eventually.become(["art3", "art2", "art1"]);
        });
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
