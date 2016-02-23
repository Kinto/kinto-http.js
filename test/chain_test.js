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
    let bucket;

    beforeEach(() => {
      bucket = new Bucket(client, "blog");
    });

    describe("#collection", () => {
      it("should return a Collection instance", () => {
        expect(bucket.collection("posts"))
          .to.be.an.instanceOf(Collection);
      });

      it("should return a named collection", () => {
        expect(bucket.collection("posts").name).eql("posts");
      });
    });

    describe("#listCollections()", () => {
      it("should list bucket collections", () => {
        sandbox.stub(client, "listCollections");

        bucket.listCollections();

        sinon.assert.calledWith(client.listCollections, "blog");
      });
    });

    describe("#createCollection()", () => {
      describe("Named collection", () => {
        it("should create a named collection", () => {
          sandbox.stub(client, "createCollection");

          bucket.createCollection("foo");

          sinon.assert.calledWith(client.createCollection, {
            bucket: "blog",
            id: "foo"
          });
        });
      });

      describe("Unnamed collection", () => {
        it("should create an unnamed collection", () => {
          sandbox.stub(client, "createCollection");

          bucket.createCollection();

          sinon.assert.calledWith(client.createCollection, {
            bucket: "blog",
          });
        });
      });

      describe("#deleteCollection", () => {
        it("should delete a collection", () => {
          sandbox.stub(client, "deleteCollection");

          bucket.deleteCollection("todelete");

          sinon.assert.calledWith(client.deleteCollection, "todelete", {
            bucket: "blog",
          });
        });
      });

      describe("#getPermissions()", () => {
        beforeEach(() => {
          sandbox.stub(bucket, "getProperties").returns(Promise.resolve({
            permissions: "fakeperms"
          }));
        });

        it("should retrieve permissions", () => {
          return bucket.getPermissions()
            .should.become("fakeperms");
        });
      });

      describe("#setPermissions()", () => {
        it("should set permissions", () => {
          sandbox.stub(client, "updateBucket");

          bucket.setPermissions("fakeperms");

          sinon.assert.calledWith(client.updateBucket, "blog", {}, {
            permissions: "fakeperms"
          });
        });
      });

      describe("#batch()", () => {
        it("should batch operations for this bucket", () => {
          sandbox.stub(client, "batch");
          const fn = batch => {};

          bucket.batch(fn);

          sinon.assert.calledWith(client.batch, fn, {
            bucket: "blog"
          });
        });
      });
    });
  });

  describe("Collection", () => {
    let coll;

    beforeEach(() => {
      const bucket = new Bucket(client, "blog");
      coll = new Collection(client, bucket, "posts");
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
      it("should set permissions", () => {
        sandbox.stub(client, "updateCollection");

        coll.setPermissions("fakeperms");

        sinon.assert.calledWith(client.updateCollection, "posts", {}, {
          bucket: "blog",
          permissions: "fakeperms"
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

        sinon.assert.calledWith(client.updateCollection, "posts", {}, {
          bucket: "blog",
          schema
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
      it("should set the collection schema", () => {
        sandbox.stub(client, "updateCollection");

        coll.setMetadata({a: 1});

        sinon.assert.calledWith(client.updateCollection, "posts", {a: 1}, {
          bucket: "blog",
          patch: true
        });
      });
    });

    describe("#createRecord()", () => {
      const record = {title: "foo"};

      it("should create a record", () => {
        sandbox.stub(client, "createRecord");

        coll.createRecord(record);

        sinon.assert.calledWith(client.createRecord, "posts", record, {
          bucket: "blog"
        });
      });
    });

    describe("#updateRecord()", () => {
      const record = {id: 2, title: "foo"};

      it("should update a record", () => {
        sandbox.stub(client, "updateRecord");

        coll.updateRecord(record);

        sinon.assert.calledWith(client.updateRecord, "posts", record, {
          bucket: "blog"
        });
      });
    });

    describe("#deleteRecord()", () => {
      it("should delete a record", () => {
        sandbox.stub(client, "deleteRecord");

        coll.deleteRecord(1);

        sinon.assert.calledWith(client.deleteRecord, "posts", 1, {
          bucket: "blog"
        });
      });
    });

    describe("#getRecord()", () => {
      it("should retrieve a record", () => {
        sandbox.stub(client, "getRecord");

        coll.getRecord(1);

        sinon.assert.calledWith(client.getRecord, "posts", 1, {
          bucket: "blog"
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
          sort: "title"
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
          collection: "posts"
        });
      });
    });
  });
});
