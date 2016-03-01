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

  before(() => {
    server = new KintoServer(TEST_KINTO_SERVER);
  });

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
    before(() => {
      return server.start();
    });

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

        describe("Safe option", () => {
          it("should not override existing bucket", () => {
            return api.createBucket("foo", {safe: true})
              .should.be.rejectedWith(Error, /412 Precondition Failed/);
          });
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

    describe("#deleteBucket()", () => {
      let last_modified;

      beforeEach(() => {
        return api.createBucket("foo")
          .then(({data}) => last_modified = data.last_modified);
      });

      it("should delete a bucket", () => {
        return api.deleteBucket("foo")
          .then(_ => api.listBuckets())
          .then(buckets => buckets.map(bucket => bucket.id))
          .should.eventually.not.include("foo");
      });

      describe("Safe option", () => {
        it("should raise a conflict error when resource has changed", () => {
          return api.deleteBucket("foo", {
            last_modified: last_modified - 1000,
            safe: true,
          })
            .should.be.rejectedWith(Error, /412 Precondition Failed/);
        });
      });
    });

    describe("#listBuckets", () => {
      beforeEach(() => {
        return api.batch(batch => {
          batch.createBucket("b1");
          batch.createBucket("b2");
        });
      });

      it("should retrieve the list of buckets", () => {
        return api.listBuckets()
          .then(buckets => buckets.map(bucket => bucket.id))
          .should.become(["b1", "b2"]);
      });
    });

    describe("#batch", () => {
      describe("No chunked requests", () => {
        it("should allow batching operations", () => {
          return api.batch(batch => {
            batch.createBucket("custom");
            batch.createCollection("blog");
            batch.createRecord("blog", {title: "art1"});
            batch.createRecord("blog", {title: "art2"});
          }, {bucket: "custom"})
            .then(_ => api.bucket("custom").collection("blog").listRecords())
            .then(({data}) => data.map(record => record.title))
            .should.become(["art2", "art1"]);
        });
      });

      describe("Chunked requests", () => {
        it("should allow batching by chunks", () => {
          return api.batch(batch => {
            batch.createBucket("custom");
            batch.createCollection("blog", {bucket: "custom"});
            for (let i=1; i<=27; i++) {
              batch.createRecord("blog", {title: "art" + i}, {bucket: "custom"});
            }
          })
            .then(_ => api.bucket("custom").collection("blog").listRecords())
            .should.eventually.have.property("data")
                           .to.have.length.of(27);
        });
      });

      describe("aggregate option", () => {
        describe("Succesful publication", () => {
          describe("No chunking", () => {
            let results;

            beforeEach(() => {
              return api.batch(batch => {
                batch.createBucket("custom");
                batch.createCollection("blog", {bucket: "custom"});
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
  });

  describe("Flushed server", function() {
    before(() => {
      return server.start();
    });

    after(() => server.stop());

    beforeEach(() => server.flush());

    it("should reject calls when a server flush is detected", () => {
      return api.fetchChangesSince("default", "tasks", {lastModified: 1})
        .should.be.rejectedWith(Error, "Server has been flushed");
    });
  });

  describe("Backed off server", () => {
    const backoffSeconds = 10;

    before(() => {
      return server.start({CLIQUET_BACKOFF: backoffSeconds});
    });

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
          .should.be.rejectedWith(Error, /HTTP 410 Gone: Service deprecated/);
      });
    });
  });

  describe("Limited pagination", () => {
    before(() => {
      return server.start({KINTO_PAGINATE_BY: 1});
    });

    after(() => server.stop());

    beforeEach(() => server.flush());

    describe("Limited configured server pagination", () => {
      let collection;

      beforeEach(() => {
        collection = api.bucket("default").collection("posts");
        return collection.batch(batch => {
          batch.createRecord({n: 1});
          batch.createRecord({n: 2});
        });
      });

      it("should fetch one results page", () => {
        return collection.listRecords()
          .then(({data}) => data.map(record => record.n))
          .should.eventually.have.length.of(1);
      });

      it("should fetch all available pages", () => {
        return collection.listRecords({pages: Infinity})
          .then(({data}) => data.map(record => record.n))
          .should.eventually.have.length.of(2);
      });
    });
  });

  describe("Chainable API", () => {
    before(() => {
      return server.start();
    });

    after(() => server.stop());

    beforeEach(() => server.flush());

    describe(".bucket()", () => {
      let bucket;

      beforeEach(() => {
        return api.createBucket("custom")
          // XXX replace with bucket.batch() when it's implemented
          .then(_ => api.batch(batch => {
            batch.createCollection("b1");
            batch.createCollection("b2");
          }, {bucket: "custom"}))
          .then(_ => {
            bucket = api.bucket("custom");
          });
      });

      describe(".getAttributes()", () => {
        let result;

        beforeEach(() => {
          return bucket.getAttributes().then(res => result = res);
        });

        it("should retrieve the bucket identifier", () => {
          expect(result.data).to.have.property("id").eql("custom");
        });

        it("should retrieve bucket last_modified value", () => {
          expect(result.data).to.have.property("last_modified").to.be.gt(1);
        });

        it("should have permissions exposed", () => {
          expect(result).to.have.property("permissions")
            .to.have.property("write").to.have.length.of(1);
        });
      });

      describe(".listCollections()", () => {
        it("should list existing collections", () => {
          return bucket.listCollections()
            .then(colls => colls.map(coll => coll.id))
            .should.become(["b1", "b2"]);
        });
      });

      describe(".permissions", () => {
        describe(".getPermissions()", () => {
          it("should retrieve bucket permissions", () => {
            return bucket.getPermissions()
              .should.eventually.have.property("write").to.have.length.of(1);
          });
        });

        describe(".setPermissions()", () => {
          it("should set bucket permissions", () => {
            return bucket.setPermissions({read: ["github:n1k0"]})
              .then(_ => bucket.getPermissions())
              .should.eventually.have.property("read").eql(["github:n1k0"]);
          });

          describe("Safe option", () => {
            it("should check for concurrency", () => {
              return bucket.setPermissions({read: ["github:n1k0"]}, {
                safe: true,
                last_modified: 1,
              })
                .should.be.rejectedWith(Error, /412 Precondition Failed/);
            });
          });
        });
      });

      describe(".createCollection()", () => {
        it("should create a named collection", () => {
          return bucket.createCollection("foo")
            .then(_ => bucket.listCollections())
            .then(colls => colls.map(coll => coll.id))
            .should.eventually.include("foo");
        });

        it("should create an automatically named collection", () => {
          let generated;

          return bucket.createCollection()
            .then(res => generated = res.data.id)
            .then(_ => bucket.listCollections())
            .then(c => expect(c.some(x => x.id === generated)).eql(true));
        });

        describe("Safe option", () => {
          it("should not override existing collection", () => {
            return bucket.createCollection("posts")
              .then(_ => bucket.createCollection("posts", {safe: true}))
              .should.be.rejectedWith(Error, /412 Precondition Failed/);
          });
        });

        describe("Permissions option", () => {
          let result;

          beforeEach(() => {
            return bucket.createCollection("posts", {
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

        describe("Data option", () => {
          let result;

          beforeEach(() => {
            return bucket.createCollection("posts", {
              data: {foo: "bar"}
            }).then(res => result = res);
          });

          it("should create a collection having the expected data attached", () => {
            expect(result).to.have.property("data")
                          .to.have.property("foo").eql("bar");
          });
        });
      });

      describe(".deleteCollection()", () => {
        it("should delete a collection", () => {
          return bucket.createCollection("foo")
            .then(_ => bucket.deleteCollection("foo"))
            .then(_ => bucket.listCollections())
            .then(colls => colls.map(coll => coll.id))
            .should.eventually.not.include("foo");
        });

        describe("Safe option", () => {
          it("should check for concurrency", () => {
            return bucket.createCollection("posts")
              .then(({data}) => bucket.deleteCollection("posts", {
                safe: true,
                last_modified: data.last_modified - 1000
              }))
              .should.be.rejectedWith(Error, /412 Precondition Failed/);
          });
        });
      });

      describe(".batch()", () => {
        it("should allow batching operations for current bucket", () => {
          return bucket.batch(batch => {
            batch.createCollection("comments");
            batch.createRecord("comments", {content: "plop"});
            batch.createRecord("comments", {content: "yo"});
          })
            .then(_ => bucket.collection("comments").listRecords())
            .then(({data}) => data.map(comment => comment.content).sort())
            .should.become(["plop", "yo"]);
        });

        describe("Safe option", () => {
          it("should allow batching operations for current bucket", () => {
            return bucket.batch(batch => {
              batch.createCollection("comments");
              batch.createCollection("comments");
            }, {safe: true, aggregate: true})
              .should.eventually.have.property("conflicts")
              .to.have.length.of(1);
          });
        });
      });
    });

    describe(".collection()", () => {
      function runSuite(label, collPromise) {
        describe(label, () => {
          let coll;

          beforeEach(() => {
            return collPromise().then(_coll => coll = _coll);
          });

          describe(".getPermissions()", () => {
            it("should retrieve permissions", () => {
              return coll.getPermissions()
                .should.eventually.have.property("write")
                .to.have.length.of(1);
            });
          });

          describe(".setPermissions()", () => {
            it("should set typed permissions", () => {
              return coll.setPermissions({read: ["github:n1k0"]})
                .then(_ => coll.getPermissions())
                .should.eventually.have.property("read")
                .eql(["github:n1k0"]);
            });

            describe("Safe option", () => {
              it("should perform concurrency checks", () => {
                return coll.setPermissions({read: ["github:n1k0"]}, {
                  safe: true,
                  last_modified: 1
                })
                  .should.be.rejectedWith(Error, /412 Precondition Failed/);
              });
            });
          });

          describe(".getSchema()", () => {
            const schema = {
              type: "object",
              properties: {
                title: {type: "string"}
              }
            };

            beforeEach(() => {
              return coll.setSchema(schema);
            });

            it("should retrieve collection schema", () => {
              return coll.getSchema()
                .should.become(schema);
            });
          });

          describe(".setSchema()", () => {
            const schema = {
              type: "object",
              properties: {
                title: {type: "string"}
              }
            };

            it("should set the collection schema", () => {
              return coll.setSchema(schema)
                .then(_ => coll.getSchema())
                .should.become(schema);
            });

            describe("Safe option", () => {
              it("should perform concurrency checks", () => {
                return coll.setSchema(schema, {
                  safe: true,
                  last_modified: 1
                })
                  .should.be.rejectedWith(Error, /412 Precondition Failed/);
              });
            });
          });

          describe(".getMetadata()", () => {
            it("should retrieve collection metadata", () => {
              return coll.setMetadata({isMeta: true})
                .then(_ => coll.getMetadata())
                .should.eventually.have.property("isMeta").eql(true);
            });
          });

          describe(".setMetadata()", () => {
            it("should set collection metadata", () => {
              return coll.setMetadata({isMeta: true})
                .then(_ => coll.getMetadata())
                .should.eventually.have.property("isMeta").eql(true);
            });

            describe("Safe option", () => {
              it("should perform concurrency checks", () => {
                return coll.setMetadata({isMeta: true}, {
                  safe: true,
                  last_modified: 1
                })
                  .should.be.rejectedWith(Error, /412 Precondition Failed/);
              });
            });
          });

          describe(".createRecord()", () => {
            it("should create a record", () => {
              return coll
                .createRecord({title: "foo"})
                .should.eventually.have.property("data")
                    .to.have.property("title").eql("foo");
            });

            describe("Safe option", () => {
              it("should check for existing record", () => {
                return coll.createRecord({title: "foo"})
                  .then(({data}) => coll.createRecord({
                    id: data.id,
                    title: "foo"
                  }, {safe: true}))
                  .should.be.rejectedWith(Error, /412 Precondition Failed/);
              });
            });
          });

          describe(".updateRecord()", () => {
            it("should update a record", () => {
              return coll
                .createRecord({title: "foo"})
                .then(({data}) => coll.updateRecord({...data, title: "mod"}))
                .then(_ => coll.listRecords())
                .then(({data}) => data[0].title)
                .should.become("mod");
            });

            it("should patch a record", () => {
              return coll.createRecord({title: "foo", blah: 42})
                .then(({data}) => coll.updateRecord({id: data.id, blah: 43},
                                                    {patch: true}))
                .then(_ => coll.listRecords())
                .then(({data}) => {
                  expect(data[0].title).eql("foo");
                  expect(data[0].blah).eql(43);
                });
            });

            it("should create the record if it doesn't exist yet", () => {
              const id = "2dcd0e65-468c-4655-8015-30c8b3a1c8f8";

              return coll.updateRecord({id, title: "blah"})
                .then(res => coll.getRecord(res.data.id))
                .should.eventually.have.property("data")
                               .to.have.property("title").eql("blah");
            });

            describe("Safe option", () => {
              it("should perform concurrency checks", () => {
                return coll.createRecord({title: "foo"})
                  .then(({data}) => coll.updateRecord({
                    id: data.id,
                    title: "foo",
                    last_modified: 1,
                  }, {safe: true}))
                  .should.be.rejectedWith(Error, /412 Precondition Failed/);
              });
            });
          });

          describe(".deleteRecord()", () => {
            it("should delete a record", () => {
              return coll
                .createRecord({title: "foo"})
                .then(({data}) => coll.deleteRecord(data.id))
                .then(_ => coll.listRecords())
                .should.eventually.have.property("data").eql([]);
            });

            describe("Safe option", () => {
              it("should perform concurrency checks", () => {
                return coll.createRecord({title: "foo"})
                  .then(({data}) => coll.deleteRecord(data.id, {
                    last_modified: 1,
                    safe: true
                  }))
                  .should.be.rejectedWith(Error, /412 Precondition Failed/);
              });
            });
          });

          describe(".getRecord()", () => {
            it("should retrieve a record by its id", () => {
              return coll.createRecord({title: "blah"})
                .then(res => coll.getRecord(res.data.id))
                .should.eventually.have.property("data")
                               .to.have.property("title").eql("blah");
            });
          });

          describe(".listRecords()", () => {
            it("should list records", () => {
              return coll
                .createRecord({title: "foo"})
                .then(_ => coll.listRecords())
                .then(({data}) => data.map(record => record.title))
                .should.become(["foo"]);
            });

            it("should order records by field", () => {
              return Promise.all(["art3", "art1", "art2"].map((title) => {
                return coll.createRecord({title});
              }))
                .then(_ => coll.listRecords({sort: "title"}))
                .then(({data}) => data.map(record => record.title))
                .should.eventually.become(["art1", "art2", "art3"]);
            });

            describe("Filtering", () => {
              beforeEach(() => {
                return coll.batch(batch => {
                  batch.createRecord({name: "paul", age: 28});
                  batch.createRecord({name: "jess", age: 54});
                  batch.createRecord({name: "john", age: 33});
                  batch.createRecord({name: "rené", age: 24});
                });
              });

              it("should filter records", () => {
                return coll.listRecords({sort: "age", filters: {min_age: 30}})
                  .then(({data}) => data.map(record => record.name))
                  .should.become(["john", "jess"]);
              });

              it("should properly escape unicode filters", () => {
                return coll.listRecords({filters: {name: "rené"}})
                  .then(({data}) => data.map(record => record.name))
                  .should.become(["rené"]);
              });
            });

            describe("Pagination", () => {
              beforeEach(() => {
                return coll.batch(batch => {
                  for (let i = 1; i <= 3; i++) {
                    batch.createRecord({n: i});
                  }
                });
              });

              it("should not paginate by default", () => {
                return coll.listRecords()
                  .then(({data}) => data.map(record => record.n))
                  .should.become([3, 2, 1]);
              });

              it("should paginate by chunks", () => {
                return coll.listRecords({limit: 2})
                  .then(({data}) => data.map(record => record.n))
                  .should.become([3, 2]);
              });

              it("should provide a next method to load next page", () => {
                return coll.listRecords({limit: 2})
                  .then(res => res.next())
                  .then(({data}) => data.map(record => record.n))
                  .should.become([1]);
              });

              it("should resolve with an empty array on exhausted pagination", () => {
                return coll.listRecords({limit: 2}) // 1st page of 2 records
                  .then(res => res.next())          // 2nd page of 1 record
                  .then(res => res.next())          // No next page
                  .should.be.rejectedWith(Error, /Pagination exhausted./);
              });

              it("should retrieve all pages", () => {
                // Note: Server has no limit by default, so here we get all the
                // records.
                return coll.listRecords()
                  .then(({data}) => data.map(record => record.n))
                  .should.become([3, 2, 1]);
              });

              it("should retrieve specified number of pages", () => {
                return coll.listRecords({limit: 1, pages: 2})
                  .then(({data}) => data.map(record => record.n))
                  .should.become([3, 2]);
              });

              it("should allow fetching next page after last page if any", () => {
                return coll.listRecords({limit: 1, pages: 1}) // 1 record
                  .then(({data, next}) => next())             // 2 records
                  .then(({data}) => data.map(record => record.n))
                  .should.become([3, 2]);
              });

              it("should should retrieve all existing pages", () => {
                return coll.listRecords({limit: 1, pages: Infinity})
                  .then(({data}) => data.map(record => record.n))
                  .should.become([3, 2, 1]);
              });
            });
          });

          describe(".batch()", () => {
            it("should allow batching operations in the current collection", () => {
              return coll.batch(batch => {
                batch.createRecord({title: "a"});
                batch.createRecord({title: "b"});
              })
                .then(_ => coll.listRecords({sort: "title"}))
                .then(({data}) => data.map(record => record.title))
                .should.become(["a", "b"]);
            });
          });
        });
      }

      runSuite("default bucket", () => {
        return api.bucket("default")
          .createCollection("plop")
          .then(_ => api.bucket("default").collection("plop"));
      });

      runSuite("custom bucket", () => {
        return api.createBucket("custom")
        .then(_ => api.bucket("custom").createCollection("plop"))
        .then(_ => api.bucket("custom").collection("plop"));
      });
    });
  });
});
