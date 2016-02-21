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

  function createClient(options={}) {
    return new Api(TEST_KINTO_SERVER, options);
  }

  beforeEach(function() {
    this.timeout(12500);

    sandbox = sinon.sandbox.create();
    const events = new EventEmitter();
    api = createClient({
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
          }).then(res => result = res);
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
          return api.createCollection()
            .then(res => result = res);
        });

        it("should create a collection with the passed id", () => {
          expect(result).to.have.property("data")
                        .to.have.property("id").to.have.length.of(8);
        });

        it("should create a collection having a list of write permissions", () => {
          expect(result).to.have.property("permissions")
                        .to.have.property("write").be.a("array");
        });
      });

      describe("permissions option", () => {
        beforeEach(() => {
          return api.createCollection({
            permissions: {
              read: ["github:n1k0"]
            }
          }).then(res => result = res);
        });

        it("should create a collection having a list of write permissions", () => {
          expect(result).to.have.property("permissions")
                        .to.have.property("read").to.eql(["github:n1k0"]);
        });
      });

      describe("data option", () => {
        beforeEach(() => {
          return api.createCollection({
            data: {foo: "bar"}
          }).then(res => result = res);
        });

        it("should create a collection having the expected data attached", () => {
          expect(result).to.have.property("data")
                        .to.have.property("foo").eql("bar");
        });
      });

      describe("bucket option", () => {
        it("should respect the bucket option", () => {
          return api.createBucket("custom")
            .then(() => api.createCollection({bucket: "custom"}))
            .should.eventually.have.property("data")
                   .to.have.property("id").to.have.length.of(8);
        });
      });
    });

    describe("#getCollection", () => {
      let collectionData;

      beforeEach(() => {
        return api.createCollection({id: "foo"})
          .then(_ => api.getCollection("foo"))
          .then(res => collectionData = res);
      });

      it("should retrieve collection id", () => {
        expect(collectionData)
          .to.have.property("data")
          .to.have.property("id").eql("foo");
      });

      it("should retrieve collection last_modified", () => {
        expect(collectionData)
          .to.have.property("data")
          .to.have.property("last_modified").gt(0);
      });

      it("should retrieve collection permissions", () => {
        expect(collectionData)
          .to.have.property("permissions")
          .to.have.property("write").to.be.an("array");
      });
    });

    describe("#createRecord", () => {
      it("should create a record", () => {
        return api.createRecord("blog", {title: "foo"})
          .then(_ => api.getRecords("blog"))
          .then(({data}) => {
            expect(data[0].title).eql("foo");
          });
      });

      describe("In batch", () => {
        it("should create a record", () => {
          return api.batch(batch => batch.createRecord("blog", {title: "foo"}))
            .then(_ => api.getRecords("blog"))
            .then(({data}) => {
              expect(data[0].title).eql("foo");
            });
        });
      });
    });

    describe("#updateRecord", () => {
      it("should update an existing record", () => {
        return api.createRecord("blog", {title: "foo"})
          .then(({data}) => api.updateRecord("blog", {id: data.id, title: "bar"}))
          .then(_ => api.getRecords("blog"))
          .then(({data}) => {
            expect(data[0].title).eql("bar");
          });
      });

      describe("In batch", () => {
        it("should update an existing record", () => {
          return api.createRecord("blog", {title: "foo"})
            .then(({data}) => api.batch(batch => {
              return batch.updateRecord("blog", {id: data.id, title: "bar"});
            }))
            .then(_ => api.getRecords("blog"))
            .then(({data}) => {
              expect(data[0].title).eql("bar");
            });
        });
      });
    });

    describe("#batch", () => {
      describe("No chunked requests", () => {
        it("should allow batching operations", () => {
          return api.batch(batch => {
            batch.createBucket("custom");
            batch.createCollection({id: "blog"});
            batch.createRecord("blog", {title: "art1"});
            batch.createRecord("blog", {title: "art2"});
          }, {bucket: "custom"})
            .then(_ => api.getRecords("blog", {bucket: "custom"}))
            .then(res => res.data.map(x => x.title))
            .should.become(["art2", "art1"]);
        });
      });

      describe("Chunked requests", () => {
        it("should allow batching by chunks", () => {
          return api.batch(batch => {
            batch.createBucket("custom");
            batch.createCollection({id: "blog", bucket: "custom"});
            for (let i=1; i<=27; i++) {
              batch.createRecord("blog", {title: "art" + i}, {bucket: "custom"});
            }
          })
            // .then(res => console.log(res))
            .then(_ => api.getRecords("blog", {bucket: "custom"}))
            .then(res => res.data)
            .should.eventually.have.length.of(27);
        });
      });

      describe("aggregate option", () => {
        describe("Succesful publication", () => {
          describe("No chunking", () => {
            let results;

            beforeEach(() => {
              return api.batch(batch => {
                batch.createBucket("custom");
                batch.createCollection({id: "blog", bucket: "custom"});
                batch.createRecord("blog", {title: "art1"}, {bucket: "custom"});
                batch.createRecord("blog", {title: "art2"}, {bucket: "custom"});
              }, {aggregate: true})
                .then(_results => results = _results);
            });

            it("should return an aggregated result object", () => {
              expect(results).to.include.keys([
                "errors",
                "conflicts",
                "published",
                "skipped"
              ]);
            });

            it("should contain the list of succesful publications", () => {
              expect(results.published.map(body => body.data))
                .to.have.length.of(4);
            });
          });

          describe("Chunked response", () => {
            let results;

            beforeEach(() => {
              return api.batch(batch => {
                for (let i=1; i<=26; i++) {
                  batch.createRecord("blog", {title: "art" + i});
                }
              }, {aggregate: true})
                .then(_results => results = _results);
            });

            it("should return an aggregated result object", () => {
              expect(results).to.include.keys([
                "errors",
                "conflicts",
                "published",
                "skipped"
              ]);
            });

            it("should contain the list of succesful publications", () => {
              expect(results.published).to.have.length.of(26);
            });
          });
        });
      });
    });

    describe("#getRecords", function() {
      const fixtures = [
        {title: "art1"},
        {title: "art2"},
        {title: "art3"},
      ];

      describe("Default bucket", () => {
        beforeEach(() => {
          return api.batch(batch => {
            // note: collections are automatically created on default bucket
            for (const record of fixtures) {
              batch.createRecord("blog", record);
            }
          });
        });

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
          return api.batch(batch => {
            batch.createBucket("custom");
            batch.createCollection({id: "blog", bucket: "custom"});
            for (const record of fixtures) {
              batch.createRecord("blog", record, {bucket: "custom"});
            }
          });
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

  describe("Chainable API", () => {
    before(() => server.start());

    after(() => server.stop());

    describe(".collection()", () => {
      let coll;

      beforeEach(() => {
        return server.flush()
          .then(_ => {
            coll = api.bucket("default").collection("plop");
          });
      });

      describe(".getPermissions()", () => {
        it("should retrieve permissions", () => {
          return coll.getPermissions()
            .should.eventually.have.property("write")
            .to.have.length.of(1);
        });
      });

      describe(".createRecord()", () => {
        it("should create a record", () => {
          return coll
            .createRecord({title: "foo"})
            .should.eventually.have.property("data")
                .to.have.property("title").eql("foo");
        });
      });

      describe(".updateRecord()", () => {
        it("should update a record", () => {
          return coll
            .createRecord({title: "foo"})
            .then(({data}) => coll.updateRecord({...data, title: "mod"}))
            .then(_ => coll.list())
            .then((records) => records[0].title)
            .should.become("mod");
        });
      });

      describe(".list()", () => {
        it("should list records", () => {
          return coll
            .createRecord({title: "foo"})
            .then(_ => coll.list())
            .then(records => records.map(record => record.title))
            .should.become(["foo"]);
        });
      });

      describe(".batch()", () => {
        it("should allow batching operations in the current collection", () => {
          return coll.batch(batch => {
            batch.createRecord({title: "a"});
            batch.createRecord({title: "b"});
          })
            .then(_ => coll.list({sort: "title"}))
            .then(records => records.map(record => record.title))
            .should.become(["a", "b"]);
        });
      });
    });
  });
});
