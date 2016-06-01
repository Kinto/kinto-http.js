"use strict";

import chai, { expect } from "chai";
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
      expect(() => coll.updateRecord(2)).to.Throw(Error, /required/);
    });

    it("should throw if id is missing", () => {
      expect(() => coll.updateRecord({})).to.Throw(Error, /required/);
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
      }, { safe: true, headers: {Foo: "Bar", Baz: "Qux"} });
    });

    it("should accept a patch option", () => {
      sandbox.stub(requests, "updateRequest");

      coll.updateRecord(record, {patch: true});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog/collections/posts/records/2", {
        data: record,
        permissions: undefined
      }, { patch: true, headers: {Foo: "Bar", Baz: "Qux"} });
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
        .to.Throw(Error, /required/);
    });

    it("should delete a record", () => {
      coll.deleteRecord("1");

      sinon.assert.calledWith(requests.deleteRequest, "/buckets/blog/collections/posts/records/1", {
        headers: {Foo: "Bar", Baz: "Qux"},
      });
    });

    it("should accept a safe option", () => {
      coll.deleteRecord("1", {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.deleteRequest, "/buckets/blog/collections/posts/records/1", {
        safe: true,
        last_modified: 42
      });
    });

    it("should delete a record using a record object", () => {
      coll.deleteRecord({id: "1"});

      sinon.assert.calledWith(requests.deleteRequest, "/buckets/blog/collections/posts/records/1", {
        headers: {Foo: "Bar", Baz: "Qux"},
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
    let headersgetSpy;
    const ETag = "\"42\"";

    describe("No pagination", () => {
      beforeEach(() => {
        sandbox.stub(client, "execute").returns(Promise.resolve({
          json: {data: [{a: 1}]},
          headers: {
            get: (name) => {
              if (name === "ETag") {
                return ETag;
              }
            }
          }
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
          .should.eventually.have.property("data").eql([{a: 1}]);
      });

      it("should resolve with a next() function", () => {
        return coll.listRecords()
          .should.eventually.have.property("next").to.be.a("function");
      });

      it("should support the since option", () => {
        coll.listRecords({since: ETag});

        const qs = "_sort=-last_modified&_since=%2242%22";
        sinon.assert.calledWithMatch(client.execute, {
          path: "/buckets/blog/collections/posts/records?" + qs,
        });
      });

      it("should throw if the since option is invalid", () => {
        expect(() => coll.listRecords({since: 123}))
        .to.Throw(Error, /Invalid value for since \(123\), should be ETag value/);
      });

      it("should resolve with the collection last_modified cast as int value", () => {
        return coll.listRecords()
          .should.eventually.have.property("last_modified").eql(ETag);
      });
    });

    describe("Filtering", () => {
      beforeEach(() => {
        sandbox.stub(client, "execute").returns(Promise.resolve({
          json: {data: []},
          headers: {get: () => {}}
        }));
      });

      it("should generate the expected filtering query string", () => {
        coll.listRecords({sort: "x", filters: {min_y: 2, not_z: 3}});

        const expectedQS = "min_y=2&not_z=3&_sort=x";
        sinon.assert.calledWithMatch(client.execute, {
          path: "/buckets/blog/collections/posts/records?" + expectedQS,
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });

      it("shouldn't need an explicit sort parameter", () => {
        coll.listRecords({filters: {min_y: 2, not_z: 3}});

        const expectedQS = "min_y=2&not_z=3&_sort=-last_modified";
        sinon.assert.calledWithMatch(client.execute, {
          path: "/buckets/blog/collections/posts/records?" + expectedQS,
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });
    });

    describe("Pagination", () => {
      it("should issue a request with the specified limit applied", () => {
        sandbox.stub(client, "execute").returns(Promise.resolve({
          json: {data: []},
          headers: {get: headersgetSpy}
        }));

        coll.listRecords({limit: 2});

        const expectedQS = "_sort=-last_modified&_limit=2";
        sinon.assert.calledWithMatch(client.execute, {
          path: "/buckets/blog/collections/posts/records?" + expectedQS,
          headers: {Foo: "Bar", Baz: "Qux"},
        });
      });

      it("should query for next page", () => {
        const { http } = coll.client;
        headersgetSpy = sandbox.stub().returns("http://next-page/");
        sandbox.stub(client, "execute").returns(Promise.resolve({
          json: {data: []},
          headers: {get: headersgetSpy}
        }));
        sandbox.stub(http, "request").returns(Promise.resolve({
          headers: {get: () => {}},
          json: {data: []}
        }));

        return coll.listRecords({limit: 2, pages: 2})
          .then(_ => {
            sinon.assert.calledWith(http.request, "http://next-page/");
          });
      });

      it("should aggregate paginated results", () => {
        const { http } = coll.client;
        sandbox.stub(http, "request")
          // settings retrieval
          .onFirstCall().returns(Promise.resolve({
            json: {settings: {}}
          }))
          // first page
          .onSecondCall().returns(Promise.resolve({
            headers: {get: () => "http://next-page/"},
            json: {data: [1, 2]}
          }))
          // second page
          .onThirdCall().returns(Promise.resolve({
            headers: {get: () => {}},
            json: {data: [3]}
          }));

        return coll.listRecords({limit: 2, pages: 2})
          .should.eventually.have.property("data").eql([1, 2, 3]);
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
