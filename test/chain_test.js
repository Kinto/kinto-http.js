"use strict";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import KintoClient from "../src";
import { Bucket, Collection } from "../src/chain";

chai.use(chaiAsPromised);
chai.should();
chai.config.includeStack = true;

const FAKE_SERVER_URL = "http://fake-server/v1";

/** @test {KintoClient} */
describe("chain module", () => {
  let sandbox, client;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    client = new KintoClient(FAKE_SERVER_URL);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("Bucket", () => {
    function getBlogBucket(options) {
      return new Bucket(client, "blog", options);
    }

    describe("Options handling", () => {
      it("should accept options", () => {
        const options = {
          headers: {Foo: "Bar"},
          safe: true,
        };
        expect(getBlogBucket(options).options).eql(options);
      });
    });

    describe("#collection()", () => {
      it("should return a Collection instance", () => {
        expect(getBlogBucket().collection("posts"))
          .to.be.an.instanceOf(Collection);
      });

      it("should return a named collection", () => {
        expect(getBlogBucket().collection("posts").name).eql("posts");
      });

      it("should propagate bucket options", () => {
        expect(getBlogBucket({
          headers: {Foo: "Bar"},
          safe: true,
        }).collection("posts", {
          headers: {Baz: "Qux"},
          safe: false,
        }).options).eql({
          bucket: "blog",
          headers: {Foo: "Bar", Baz: "Qux"},
          safe: false,
        });
      });
    });

    describe("#listCollections()", () => {
      beforeEach(() => {
        sandbox.stub(client, "listCollections");
      });

      it("should list bucket collections", () => {
        getBlogBucket().listCollections();

        sinon.assert.calledWith(client.listCollections, "blog");
      });

      it("should merge default options", () => {
        getBlogBucket({headers: {Foo: "Bar"}})
          .listCollections({headers: {Baz: "Qux"}});

        sinon.assert.calledWithMatch(client.listCollections, "blog", {
          headers: {Foo: "Bar", Baz: "Qux"}
        });
      });
    });

    describe("#createCollection()", () => {
      beforeEach(() => {
        sandbox.stub(client, "createCollection");
      });

      describe("Named collection", () => {
        it("should create a named collection", () => {
          getBlogBucket().createCollection("foo");

          sinon.assert.calledWith(client.createCollection, "foo", {
            bucket: "blog",
            headers: {},
          });
        });

        it("should merge default options", () => {
          getBlogBucket({
            headers: {Foo: "Bar"},
            safe: true,
          }).createCollection("foo", {headers: {Baz: "Qux"}});

          sinon.assert.calledWithExactly(client.createCollection, "foo", {
            bucket: "blog",
            headers: {Foo: "Bar", Baz: "Qux"},
            safe: true,
          });
        });
      });

      describe("Unnamed collection", () => {
        it("should create an unnamed collection", () => {
          getBlogBucket().createCollection();

          sinon.assert.calledWith(client.createCollection, undefined, {
            bucket: "blog",
            headers: {},
          });
        });

        it("should merge default options", () => {
          getBlogBucket({
            headers: {Foo: "Bar"},
            safe: true,
          }).createCollection({}, {headers: {Baz: "Qux"}});

          sinon.assert.calledWithExactly(client.createCollection, {}, {
            bucket: "blog",
            headers: {Foo: "Bar", Baz: "Qux"},
            safe: true,
          });
        });
      });
    });

    describe("#deleteCollection", () => {
      beforeEach(() => {
        sandbox.stub(client, "deleteCollection");
      });

      it("should delete a collection", () => {
        getBlogBucket().deleteCollection("todelete");

        sinon.assert.calledWith(client.deleteCollection, {id: "todelete"}, {
          bucket: "blog",
          headers: {},
        });
      });

      it("should merge default options", () => {
        getBlogBucket({
          headers: {Foo: "Bar"},
          safe: true,
        }).deleteCollection("todelete", {headers: {Baz: "Qux"}});

        sinon.assert.calledWithExactly(client.deleteCollection, {id: "todelete"}, {
          bucket: "blog",
          headers: {Foo: "Bar", Baz: "Qux"},
          safe: true,
        });
      });
    });

    describe("#getPermissions()", () => {
      it("should retrieve permissions", () => {
        const bucket = getBlogBucket();
        sandbox.stub(bucket, "getProperties").returns(Promise.resolve({
          permissions: "fakeperms"
        }));

        return bucket.getPermissions().should.become("fakeperms");
      });

      it("should merge default options", () => {
        const bucket = getBlogBucket({
          headers: {Foo: "Bar"},
          safe: true,
        });
        sandbox.stub(bucket, "getProperties").returns(Promise.resolve({
          permissions: "fakeperms"
        }));

        return bucket.getPermissions({headers: {Baz: "Qux"}}).then(_ => {
          sinon.assert.calledWithMatch(bucket.getProperties, {
            headers: {Foo: "Bar", Baz: "Qux"},
            safe: true,
          });
        });
      });
    });

    describe("#setPermissions()", () => {
      beforeEach(() => {
        sandbox.stub(client, "updateBucket");
      });

      it("should set permissions", () => {
        getBlogBucket().setPermissions("fakeperms");

        sinon.assert.calledWithMatch(client.updateBucket, "blog", {}, {
          permissions: "fakeperms"
        });
      });

      it("should merge default options", () => {
        getBlogBucket({
          headers: {Foo: "Bar"},
          safe: true,
        }).setPermissions("fakeperms", {headers: {Baz: "Qux"}});

        sinon.assert.calledWithMatch(client.updateBucket, "blog", {}, {
          permissions: "fakeperms",
          headers: {Foo: "Bar", Baz: "Qux"},
          safe: true,
        });
      });
    });

    describe("#batch()", () => {
      beforeEach(() => {
        sandbox.stub(client, "batch");
      });

      it("should batch operations for this bucket", () => {
        const fn = batch => {};

        getBlogBucket().batch(fn);

        sinon.assert.calledWith(client.batch, fn, {
          bucket: "blog",
          headers: {},
        });
      });

      it("should merge default options", () => {
        const fn = batch => {};

        getBlogBucket({
          headers: {Foo: "Bar"},
          safe: true,
        }).batch(fn, {headers: {Baz: "Qux"}});

        sinon.assert.calledWithExactly(client.batch, fn, {
          bucket: "blog",
          headers: {Foo: "Bar", Baz: "Qux"},
          safe: true,
        });
      });
    });
  });

  describe("Collection", () => {
    let coll;

    beforeEach(() => {
      const bucket = new Bucket(client, "blog", {headers: {Foo: "Bar"}});
      coll = new Collection(client, bucket, "posts", {headers: {Baz: "Qux"}});
    });

    describe("#getPermissions()", () => {
      beforeEach(() => {
        sandbox.stub(coll, "getProperties").returns(Promise.resolve({
          permissions: "fakeperms"
        }));
      });

      it("should retrieve permissions", () => {
        return coll.getPermissions()
          .should.become("fakeperms");
      });
    });

    describe("#setPermissions()", () => {
      beforeEach(() => {
        sandbox.stub(client, "updateCollection");
      });

      it("should set permissions", () => {
        return coll.setPermissions("fakeperms")
          .then(_ => {
            sinon.assert.calledWith(client.updateCollection, {id: "posts"}, {
              bucket: "blog",
              permissions: "fakeperms",
              headers: {Foo: "Bar", Baz: "Qux"},
            });
          });
      });

      it("should handle the safe option", () => {
        sandbox.stub(coll, "getProperties").returns(Promise.resolve({
          data: {
            id: "posts",
            last_modified: 42,
          }
        }));

        return coll.setPermissions("fakeperms", {safe: true})
          .then(_ => {
            sinon.assert.calledWith(client.updateCollection, {
              id: "posts",
              last_modified: 42
            }, {
              bucket: "blog",
              permissions: "fakeperms",
              headers: {Foo: "Bar", Baz: "Qux"},
              safe: true,
            });
          });
      });
    });

    describe("#getSchema()", () => {
      const schema = {title: "schema"};

      beforeEach(() => {
        sandbox.stub(coll, "getProperties").returns(Promise.resolve({
          data: {schema}
        }));
      });

      it("should retrieve the collection schema", () => {
        return coll.getSchema()
          .should.become(schema);
      });
    });

    describe("#setSchema()", () => {
      const schema = {title: "schema"};

      it("should set the collection schema", () => {
        sandbox.stub(client, "updateCollection");

        coll.setSchema(schema);

        sinon.assert.calledWith(client.updateCollection, {id: "posts"}, {
          bucket: "blog",
          schema,
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });

    describe("#getMetadata()", () => {
      beforeEach(() => {
        sandbox.stub(coll, "getProperties").returns(Promise.resolve({
          data: {a: 1}
        }));
      });

      it("should retrieve metadata", () => {
        return coll.getMetadata()
          .should.become({a: 1});
      });
    });

    describe("#setMetadata()", () => {
      it("should set the metadata", () => {
        sandbox.stub(client, "updateCollection");

        coll.setMetadata({a: 1});

        sinon.assert.calledWith(client.updateCollection, {id: "posts", a: 1}, {
          bucket: "blog",
          patch: true,
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });

    describe("#createRecord()", () => {
      const record = {title: "foo"};

      it("should create a record", () => {
        sandbox.stub(client, "createRecord");

        coll.createRecord(record);

        sinon.assert.calledWith(client.createRecord, "posts", record, {
          bucket: "blog",
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });

    describe("#updateRecord()", () => {
      const record = {id: 2, title: "foo"};

      it("should update a record", () => {
        sandbox.stub(client, "updateRecord");

        coll.updateRecord(record);

        sinon.assert.calledWith(client.updateRecord, "posts", record, {
          bucket: "blog",
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });

    describe("#deleteRecord()", () => {
      it("should delete a record", () => {
        sandbox.stub(client, "deleteRecord");

        coll.deleteRecord(1);

        sinon.assert.calledWith(client.deleteRecord, "posts", 1, {
          bucket: "blog",
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });

    describe("#getRecord()", () => {
      it("should retrieve a record", () => {
        sandbox.stub(client, "getRecord");

        coll.getRecord(1);

        sinon.assert.calledWith(client.getRecord, "posts", 1, {
          bucket: "blog",
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });

    describe("#listRecords()", () => {
      beforeEach(() => {
        sandbox.stub(client, "listRecords").returns(Promise.resolve({
          data: [{a: 1}]
        }));
      });

      it("should list records", () => {
        coll.listRecords({sort: "title"});

        sinon.assert.calledWith(client.listRecords, "posts", {
          bucket: "blog",
          sort: "title",
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });

      it("should resolve with records list", () => {
        return coll.listRecords()
          .should.become([{a: 1}]);
      });
    });

    describe("#batch()", () => {
      it("should batch operations", () => {
        sandbox.stub(client, "batch");
        const fn = batch => {};

        coll.batch(fn);

        sinon.assert.calledWith(client.batch, fn, {
          bucket: "blog",
          collection: "posts",
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });
  });
});
