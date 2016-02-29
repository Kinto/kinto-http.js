"use strict";

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import KintoClient from "../src";
import Bucket from "../src/bucket";
import Collection from "../src/collection";
import * as requests from "../src/requests";


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

  function getBlogPostsCollection(options) {
    return new Bucket(client, "blog").collection("posts", options);
  }

  /** @test {Collection#getAttributes} */
  describe("#getAttributes()", () => {
    it("should execute expected request", () => {
      sandbox.stub(client, "execute").returns(Promise.resolve());

      getBlogPostsCollection().getAttributes();

      sinon.assert.calledWithMatch(client.execute, {
        path: "/buckets/blog/collections/posts",
      });
    });

    it("should resolve with response data", () => {
      const data = {data: true};
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: data
      }));

      return getBlogPostsCollection().getAttributes()
        .should.become(data);
    });
  });

  /** @test {Collection#getPermissions} */
  describe("#getPermissions()", () => {
    beforeEach(() => {
      sandbox.stub(coll, "getAttributes").returns(Promise.resolve({
        permissions: "fakeperms"
      }));
    });

    it("should retrieve permissions", () => {
      return coll.getPermissions()
        .should.become("fakeperms");
    });
  });

  /** @test {Collection#setPermissions} */
  describe("#setPermissions()", () => {
    const fakePermissions = {read: [], write: []};

    beforeEach(() => {
      sandbox.stub(requests, "updateCollection");
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {}
      }));
    });

    it("should set permissions", () => {
      coll.setPermissions(fakePermissions);

      sinon.assert.calledWithMatch(requests.updateCollection, {id: "posts"}, {
        bucket: "blog",
        permissions: fakePermissions,
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should handle the safe option", () => {
      coll.setPermissions(fakePermissions, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.updateCollection, {
        id: "posts",
      }, {
        bucket: "blog",
        permissions: fakePermissions,
        headers: {Foo: "Bar", Baz: "Qux"},
        last_modified: 42,
        safe: true,
      });
    });

    it("should resolve with json result", () => {
      return coll.setPermissions(fakePermissions)
        .should.become({});
    });
  });

  /** @test {Collection#getSchema} */
  describe("#getSchema()", () => {
    const schema = {title: "schema"};

    beforeEach(() => {
      sandbox.stub(coll, "getAttributes").returns(Promise.resolve({
        data: {schema}
      }));
    });

    it("should retrieve the collection schema", () => {
      return coll.getSchema()
        .should.become(schema);
    });
  });

  /** @test {Collection#setSchema} */
  describe("#setSchema()", () => {
    const schema = {title: "schema"};

    beforeEach(() => {
      sandbox.stub(requests, "updateCollection");
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: 1}
      }));
    });

    it("should set the collection schema", () => {
      coll.setSchema(schema);

      sinon.assert.calledWithMatch(requests.updateCollection, {id: "posts"}, {
        bucket: "blog",
        schema,
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should handle the safe option", () => {
      coll.setSchema(schema, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.updateCollection, {
        id: "posts",
      }, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
        schema,
        safe: true,
        last_modified: 42
      });
    });

    it("should resolve with json result", () => {
      return coll.setSchema(schema)
        .should.become({data: 1});
    });
  });

  /** @test {Collection#getMetadata} */
  describe("#getMetadata()", () => {
    beforeEach(() => {
      sandbox.stub(coll, "getAttributes").returns(Promise.resolve({
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
      sandbox.stub(requests, "updateCollection");
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: 1}
      }));
    });

    it("should set the metadata", () => {
      coll.setMetadata({a: 1});

      sinon.assert.calledWithMatch(requests.updateCollection, {id: "posts"}, {
        bucket: "blog",
        patch: true,
        headers: {Foo: "Bar", Baz: "Qux"},
        metadata: {a: 1}
      });
    });

    it("should handle the safe option", () => {
      coll.setMetadata({a: 1}, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.updateCollection, {
        id: "posts",
      }, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
        patch: true,
        safe: true,
        last_modified: 42,
        metadata: {a: 1}
      });
    });

    it("should resolve with json result", () => {
      return coll.setMetadata({a: 1})
        .should.become({data: 1});
    });
  });

  /** @test {Collection#createRecord} */
  describe("#createRecord()", () => {
    const record = {title: "foo"};

    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: 1}
      }));
    });

    it("should create the expected request", () => {
      sandbox.stub(requests, "createRecord");

      coll.createRecord(record);

      sinon.assert.calledWith(requests.createRecord, "posts", record, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should accept a safe option", () => {
      sandbox.stub(requests, "createRecord");

      coll.createRecord(record, {safe: true});

      sinon.assert.calledWithMatch(requests.createRecord, "posts", record, {
        safe: true
      });
    });

    it("should execute the expected request", () => {
      return coll.createRecord(record)
        .then(() => {
          sinon.assert.calledWithMatch(client.execute, {
            path: "/buckets/blog/collections/posts/records"
          });
        });
    });

    it("should resolve with response body", () => {
      return coll.createRecord(record)
        .should.become({data: 1});
    });
  });

  /** @test {Collection#updateRecord} */
  describe("#updateRecord()", () => {
    const record = {id: 2, title: "foo"};

    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: 1}
      }));
    });

    it("should create the expected request", () => {
      sandbox.stub(requests, "updateRecord");

      coll.updateRecord(record);

      sinon.assert.calledWith(requests.updateRecord, "posts", record, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should accept a safe option", () => {
      sandbox.stub(requests, "updateRecord");

      coll.updateRecord({...record, last_modified: 42}, {safe: true});

      sinon.assert.calledWithMatch(requests.updateRecord, "posts", record, {
        safe: true,
      });
    });

    it("should accept a patch option", () => {
      sandbox.stub(requests, "updateRecord");

      coll.updateRecord(record, {patch: true});

      sinon.assert.calledWithMatch(requests.updateRecord, "posts", record, {
        patch: true
      });
    });

    it("should update a record", () => {
      sandbox.stub(requests, "updateRecord");

      coll.updateRecord(record);

      sinon.assert.calledWith(requests.updateRecord, "posts", record, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });


    it("should resolve with response body", () => {
      return coll.updateRecord(record)
        .should.become({data: 1});
    });
  });

  /** @test {Collection#deleteRecord} */
  describe("#deleteRecord()", () => {
    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: 1}
      }));
    });

    it("should delete a record", () => {
      sandbox.stub(requests, "deleteRecord");

      coll.deleteRecord("1");

      sinon.assert.calledWith(requests.deleteRecord, "posts", {id: "1"}, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should accept a safe option", () => {
      sandbox.stub(requests, "deleteRecord");

      coll.deleteRecord("1", {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.deleteRecord, "posts", {id: "1"}, {
        safe: true,
        last_modified: 42
      });
    });

    it("should delete a record using a record object", () => {
      sandbox.stub(requests, "deleteRecord");

      coll.deleteRecord({id: "1"});

      sinon.assert.calledWith(requests.deleteRecord, "posts", {id: "1"}, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });
  });

  /** @test {Collection#getRecord} */
  describe("#getRecord()", () => {
    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: 1}
      }));
    });

    it("should execute expected request", () => {
      coll.getRecord(1);

      sinon.assert.calledWith(client.execute, {
        bucket: "blog",
        path: "/buckets/blog/collections/posts/records/1",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should retrieve a record", () => {
      return coll.getRecord(1)
        .should.become({data: 1});
    });
  });

  /** @test {Collection#listRecords} */
  describe("#listRecords()", () => {
    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: [{a: 1}]}
      }));
    });

    it("should execute expected request", () => {
      coll.listRecords();

      sinon.assert.calledWithMatch(client.execute, {
        path: "/buckets/blog/collections/posts/records?_sort=-last_modified",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should sort records", () => {
      coll.listRecords({sort: "title"});

      sinon.assert.calledWithMatch(client.execute, {
        path: "/buckets/blog/collections/posts/records?_sort=title",
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should resolve with records list", () => {
      return coll.listRecords()
        .should.become([{a: 1}]);
    });
  });

  /** @test {Collection#batch} */
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
