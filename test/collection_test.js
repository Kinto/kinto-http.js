"use strict";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import KintoClient from "../src";
import Bucket from "../src/bucket";
import Collection from "../src/collection";


chai.use(chaiAsPromised);
chai.should();
chai.config.includeStack = true;

const FAKE_SERVER_URL = "http://fake-server/v1";

/** @test {Collection} */
describe("Collection", () => {
  let sandbox, client, coll;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    client = new KintoClient(FAKE_SERVER_URL);
    const bucket = new Bucket(client, "blog", {headers: {Foo: "Bar"}});
    coll = new Collection(client, bucket, "posts", {headers: {Baz: "Qux"}});
  });

  afterEach(() => {
    sandbox.restore();
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
      coll.setPermissions("fakeperms");

      sinon.assert.calledWithMatch(client.updateCollection, {id: "posts"}, {
        bucket: "blog",
        permissions: "fakeperms",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should handle the safe option", () => {
      coll.setPermissions("fakeperms", {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(client.updateCollection, {
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

    beforeEach(() => {
      sandbox.stub(client, "updateCollection");
    });

    it("should set the collection schema", () => {
      coll.setSchema(schema);

      sinon.assert.calledWithMatch(client.updateCollection, {id: "posts"}, {
        bucket: "blog",
        schema,
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should handle the safe option", () => {
      coll.setSchema(schema, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(client.updateCollection, {
        id: "posts",
        last_modified: 42
      }, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
        schema,
        safe: true
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
    beforeEach(() => {
      sandbox.stub(client, "updateCollection");
    });

    it("should set the metadata", () => {
      coll.setMetadata({a: 1});

      sinon.assert.calledWithMatch(client.updateCollection, {id: "posts", a: 1}, {
        bucket: "blog",
        patch: true,
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should handle the safe option", () => {
      coll.setMetadata({a: 1}, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(client.updateCollection, {
        id: "posts",
        last_modified: 42,
        a: 1
      }, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
        patch: true,
        safe: true
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

      coll.deleteRecord("1");

      sinon.assert.calledWith(client.deleteRecord, "posts", {id: "1"}, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should delete a record using a record object", () => {
      sandbox.stub(client, "deleteRecord");

      coll.deleteRecord({id: "1"});

      sinon.assert.calledWith(client.deleteRecord, "posts", {id: "1"}, {
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
