"use strict";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import KintoClient from "../src";
import Bucket from "../src/bucket";
import Collection, { computeSnapshotAt } from "../src/collection";
import * as requests from "../src/requests";
import { fakeServerResponse } from "./test_utils.js";


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

  /** @test {Collection#getTotalRecords} */
  describe("#getTotalRecords()", () => {
    it("should execute expected request", () => {
      sandbox.stub(client, "execute").returns(Promise.resolve());

      getBlogPostsCollection().getTotalRecords();

      sinon.assert.calledWithMatch(client.execute, {
        method: "HEAD",
        path: "/buckets/blog/collections/posts/records",
      }, {raw: true});
    });

    it("should resolve with the Total-Records header value", () => {
      sandbox.stub(client, "execute")
        .returns(Promise.resolve({headers: {get() {return 42;}}}));

      return getBlogPostsCollection().getTotalRecords()
        .should.become(42);
    });
  });

  /** @test {Collection#getData} */
  describe("#getData()", () => {
    it("should execute expected request", () => {
      sandbox.stub(client, "execute").returns(Promise.resolve());

      getBlogPostsCollection().getData();

      sinon.assert.calledWithMatch(client.execute, {
        path: "/buckets/blog/collections/posts",
      });
    });

    it("should resolve with response data", () => {
      const response = {data: {foo: "bar"}};
      sandbox.stub(client, "execute").returns(Promise.resolve(response));

      return getBlogPostsCollection().getData()
        .should.become({foo: "bar"});
    });
  });

  /** @test {Collection#getPermissions} */
  describe("#getPermissions()", () => {
    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({
        data: {}, permissions: {"write": ["fakeperms"]}
      }));
    });

    it("should retrieve permissions", () => {
      return coll.getPermissions()
        .should.become({"write": ["fakeperms"]});
    });
  });

  /** @test {Collection#setPermissions} */
  describe("#setPermissions()", () => {
    const fakePermissions = {read: [], write: []};

    beforeEach(() => {
      sandbox.stub(requests, "updateRequest");
      sandbox.stub(client, "execute").returns(Promise.resolve({}));
    });

    it("should set permissions", () => {
      coll.setPermissions(fakePermissions);

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog/collections/posts", {
        data: { last_modified: undefined },
        permissions: fakePermissions
      }, {headers: {Foo: "Bar", Baz: "Qux"}});
    });

    it("should handle the safe option", () => {
      coll.setPermissions(fakePermissions, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog/collections/posts", {
        data: { last_modified: 42 },
        permissions: fakePermissions
      }, {
        headers: {Foo: "Bar", Baz: "Qux"},
        safe: true,
      });
    });

    it("should resolve with json result", () => {
      return coll.setPermissions(fakePermissions)
        .should.become({});
    });
  });

  /** @test {Collection#getData} */
  describe("#getData()", () => {
    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({data: {a: 1}}));
    });

    it("should retrieve data", () => {
      return coll.getData()
        .should.become({a: 1});
    });
  });

  describe("#setData()", () => {
    beforeEach(() => {
      sandbox.stub(requests, "updateRequest");
      sandbox.stub(client, "execute").returns(Promise.resolve({data: {foo: "bar"}}));
    });

    it("should set the data", () => {
      coll.setData({a: 1});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog/collections/posts", {
        data: {a: 1},
        permissions: undefined
      }, {
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should handle the safe option", () => {
      coll.setData({a: 1}, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog/collections/posts", {
        data: {a: 1},
        permissions: undefined
      }, {
        headers: {Foo: "Bar", Baz: "Qux"},
        safe: true,
        last_modified: 42,
      });
    });

    it("should resolve with json result", () => {
      return coll.setData({a: 1})
        .should.become({data: {foo: "bar"}});
    });
  });

  /** @test {Collection#createRecord} */
  describe("#createRecord()", () => {
    const record = {title: "foo"};

    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({data: 1}));
    });

    it("should create the expected request", () => {
      sandbox.stub(requests, "createRequest");

      coll.createRecord(record);

      sinon.assert.calledWith(requests.createRequest, "/buckets/blog/collections/posts/records", {
        data: record,
        permissions: undefined
      }, { headers: {Foo: "Bar", Baz: "Qux"} });
    });

    it("should accept a safe option", () => {
      sandbox.stub(requests, "createRequest");

      coll.createRecord(record, {safe: true});

      sinon.assert.calledWithMatch(requests.createRequest, "/buckets/blog/collections/posts/records", {
        data: record,
        permissions: undefined
      }, {
        safe: true,
        headers: {Foo: "Bar", Baz: "Qux"}
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
      sandbox.stub(client, "execute").returns(Promise.resolve({data: 1}));
    });

    it("should throw if record is not an object", () => {
      expect(() => coll.updateRecord(2))
        .to.Throw(Error, /record object is required/);
    });

    it("should throw if id is missing", () => {
      expect(() => coll.updateRecord({}))
        .to.Throw(Error, /record id is required/);
    });

    it("should create the expected request", () => {
      sandbox.stub(requests, "updateRequest");

      coll.updateRecord(record);

      sinon.assert.calledWith(requests.updateRequest, "/buckets/blog/collections/posts/records/2", {
        data: record,
        permissions: undefined
      }, { headers: {Foo: "Bar", Baz: "Qux"} });
    });

    it("should accept a safe option", () => {
      sandbox.stub(requests, "updateRequest");

      coll.updateRecord({...record, last_modified: 42}, {safe: true});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog/collections/posts/records/2", {
        data: {...record, last_modified: 42},
        permissions: undefined
      }, {
        safe: true,
        headers: {Foo: "Bar", Baz: "Qux"}
      });
    });

    it("should accept a patch option", () => {
      sandbox.stub(requests, "updateRequest");

      coll.updateRecord(record, {patch: true});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog/collections/posts/records/2", {
        data: record,
        permissions: undefined
      }, {
        patch: true,
        headers: {Foo: "Bar", Baz: "Qux"}
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
      sandbox.stub(requests, "deleteRequest");
      sandbox.stub(client, "execute").returns(Promise.resolve({data: 1}));
    });

    it("should throw if id is missing", () => {
      expect(() => coll.deleteRecord({}))
        .to.Throw(Error, /record id is required/);
    });

    it("should delete a record", () => {
      coll.deleteRecord("1");

      sinon.assert.calledWith(requests.deleteRequest, "/buckets/blog/collections/posts/records/1", {
        last_modified: undefined,
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should accept a safe option", () => {
      coll.deleteRecord("1", {safe: true});

      sinon.assert.calledWithMatch(requests.deleteRequest, "/buckets/blog/collections/posts/records/1", {
        last_modified: undefined,
        safe: true
      });
    });

    it("should rely on the provided last_modified for the safe option", () => {
      coll.deleteRecord({id: "1", last_modified: 42}, {safe: true});

      sinon.assert.calledWithMatch(requests.deleteRequest, "buckets/blog/collections/posts/records/1", {
        last_modified: 42,
        safe: true
      });
    });
  });

  /** @test {Collection#getRecord} */
  describe("#getRecord()", () => {
    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({data: 1}));
    });

    it("should execute expected request", () => {
      coll.getRecord(1);

      sinon.assert.calledWith(client.execute, {
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
    const data = [{id: "a"}, {id: "b"}];

    beforeEach(() => {
      sandbox.stub(coll.client, "paginatedList").returns(Promise.resolve({data}));
    });

    it("should execute expected request", () => {
      coll.listRecords({_since: "42"});

      sinon.assert.calledWithMatch(coll.client.paginatedList,
        "/buckets/blog/collections/posts/records",
        {_since: "42"},
        {headers: {Baz: "Qux", Foo: "Bar"}});
    });

    it("should support passing custom headers", () => {
      coll.client.defaultReqOptions.headers = {Foo: "Bar"};
      coll.listRecords({headers: {Baz: "Qux"}});

      sinon.assert.calledWithMatch(coll.client.paginatedList,
        "/buckets",
        {},
        {
          headers: {Foo: "Bar", Baz: "Qux"}
        });
    });

    it("should resolve with a result object", () => {
      return coll.listRecords()
        .should.eventually.have.property("data").eql(data);
    });


    describe("Retry", () => {

      const response = {data: [{id: 1, title: "art"}]};

      beforeEach(() => {
        sandbox.restore();
        sandbox.stub(global, "setTimeout", (fn) => setImmediate(fn));
        const fetch = sandbox.stub(global, "fetch");
        fetch.onCall(0).returns(fakeServerResponse(200, {}));
        fetch.onCall(1).returns(fakeServerResponse(503, {}, {"Retry-After": "1"}));
        fetch.onCall(2).returns(fakeServerResponse(200, response));
      });

      it("should retry the request if option is specified", () => {
        return coll.listRecords({retry: 1})
          .then(r => r.data[0])
          .should.eventually.have.property("title").eql("art");
      });
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

describe("computeSnapshotAt()", () => {
  const rec1 = {id: 1, last_modified: 41};
  const rec2 = {id: 2, last_modified: 42};
  const rec3 = {id: 3, last_modified: 43};

  it("should delete created entries", () => {
    const records = [rec1, rec2, rec3];
    const changes = [
      {action: "create", target: {data: rec3}},
      {action: "create", target: {data: rec2}},
      {action: "create", target: {data: rec1}},
    ];

    expect(computeSnapshotAt(42, records, changes))
      .eql([]);
  });

  it("should restore deleted entries", () => {
    const records = [rec2, rec3];
    const changes = [
      {action: "delete", target: {data: {id: 1, last_modified: 44}}},
      {action: "create", target: {data: rec3}},
    ];

    expect(computeSnapshotAt(42, records, changes))
      .eql([rec2]);
  });

  it("should restore updated entries", () => {
    const records = [rec1, rec2, rec3];
    const changes = [
      {action: "update", target: {data: {...rec2, last_modified: 44}}},
    ];

    expect(computeSnapshotAt(45, records, changes))
      .eql([{...rec2, last_modified: 44}, rec3, rec1]);
  });

  it("should raise when snapshot exceeds period covered by changes", () => {
    const records = [{id: 1, last_modified: 43}, {id: 2, last_modified: 44}];
    const changes = [
      {action: "create", target: {data: {last_modified: 44}}}
    ];

    expect(() => computeSnapshotAt(42, records, changes))
      .to.Throw(Error, /not enough history data/);
  });
});
