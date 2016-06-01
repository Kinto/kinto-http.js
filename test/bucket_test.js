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

/** @test {Bucket} */
describe("Bucket", () => {
  let sandbox, client;

  function getBlogBucket(options) {
    return new Bucket(client, "blog", options);
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    client = new KintoClient(FAKE_SERVER_URL);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("Options handling", () => {
    it("should accept options", () => {
      const options = {
        headers: {Foo: "Bar"},
        safe: true,
      };
      expect(getBlogBucket(options).options).eql(options);
    });
  });

  /** @test {Bucket#getData} */
  describe("#getData()", () => {
    it("should execute expected request", () => {
      sandbox.stub(client, "execute").returns(Promise.resolve());

      getBlogBucket().getData();

      sinon.assert.calledWithMatch(client.execute, {
        path: "/buckets/blog",
      });
    });

    it("should resolve with response data", () => {
      const response = {data: {foo: "bar"}, permissions: {}};
      sandbox.stub(client, "execute").returns(Promise.resolve(response));

      return getBlogBucket().getData()
        .should.become({foo: "bar"});
    });
  });

  describe("#setData()", () => {
    beforeEach(() => {
      sandbox.stub(requests, "updateRequest");
      sandbox.stub(client, "execute").returns(Promise.resolve({data: 1}));
    });

    it("should set the bucket data", () => {
      getBlogBucket().setData({a: 1});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog", {
        data: {id: "blog", a: 1},
        permissions: undefined
      }, {headers: {}});
    });

    it("should handle the patch option", () => {
      getBlogBucket().setData({a: 1}, {patch: true});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog", {
        data: {id: "blog", a: 1},
        permissions: undefined
      }, {patch: true});
    });

    it("should handle the safe option", () => {
      getBlogBucket().setData({a: 1}, {safe: true, last_modified: 42});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog", {
        data: {id: "blog", a: 1},
        permissions: undefined
      }, {
        headers: {},
        safe: true,
        last_modified: 42,
      });
    });

    it("should resolve with json result", () => {
      return getBlogBucket().setData({a: 1})
        .should.become({data: 1});
    });
  });


  /** @test {Bucket#collection} */
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
        batch: false,
      });
    });
  });

  /** @test {Bucket#listCollections} */
  describe("#listCollections()", () => {
    const data = [{id: "a"}, {id: "b"}];

    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve(data));
    });

    it("should list bucket collections", () => {
      getBlogBucket().listCollections();

      sinon.assert.calledWithMatch(client.execute, {
        path: "/buckets/blog/collections"
      });
    });

    it("should merge default options", () => {
      getBlogBucket({headers: {Foo: "Bar"}})
        .listCollections({headers: {Baz: "Qux"}});

      sinon.assert.calledWithMatch(client.execute, {
        headers: {Foo: "Bar", Baz: "Qux"}
      });
    });

    it("should return the list of collections", () => {
      return getBlogBucket().listCollections()
        .should.become(data);
    });
  });

  /** @test {Bucket#createCollection} */
  describe("#createCollection()", () => {
    beforeEach(() => {
      sandbox.stub(requests, "createRequest");
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: {}}
      }));
    });

    it("should accept a safe option", () => {
      getBlogBucket().createCollection("foo", {safe: true});

      sinon.assert.calledWithMatch(requests.createRequest, "/buckets/blog/collections/foo", {
        data: {id: "foo"},
        permissions: undefined
      }, { safe: true });
    });

    it("should extend request headers with optional ones", () => {
      getBlogBucket({headers: {Foo: "Bar"}})
        .createCollection("foo", {headers: {Baz: "Qux"}});

      sinon.assert.calledWithMatch(requests.createRequest, "/buckets/blog/collections/foo", {
        data: {id: "foo"},
        permissions: undefined
      }, { headers: {Foo: "Bar", Baz: "Qux"} });
    });

    describe("Named collection", () => {
      it("should create a named collection", () => {
        getBlogBucket().createCollection("foo");

        sinon.assert.calledWithMatch(requests.createRequest, "/buckets/blog/collections/foo", {
          data: {id: "foo"},
          permissions: undefined
        }, { headers: {} });
      });

      it("should merge default options", () => {
        getBlogBucket({
          headers: {Foo: "Bar"},
          safe: true,
        }).createCollection("foo", {headers: {Baz: "Qux"}});

        sinon.assert.calledWithMatch(requests.createRequest, "/buckets/blog/collections/foo", {
          data: {id: "foo"},
          permissions: undefined
        }, {
          headers: {Foo: "Bar", Baz: "Qux"},
          safe: true
        });
      });
    });

    describe("Unnamed collection", () => {
      it("should create an unnamed collection", () => {
        getBlogBucket().createCollection();

        sinon.assert.calledWithMatch(requests.createRequest, "/buckets/blog/collections", {
          data: {id: undefined},
          permissions: undefined
        }, {headers: {}});
      });

      it("should merge default options", () => {
        getBlogBucket({
          headers: {Foo: "Bar"},
          safe: true,
        }).createCollection({}, {headers: {Baz: "Qux"}});

        sinon.assert.calledWithMatch(requests.createRequest, "/buckets/blog/collections", {
          data: {},
          permissions: undefined
        }, {
          headers: {Foo: "Bar", Baz: "Qux"},
          safe: true
        });
      });
    });
  });

  /** @test {Bucket#deleteCollection} */
  describe("#deleteCollection", () => {
    beforeEach(() => {
      sandbox.stub(requests, "deleteRequest");
      sandbox.stub(client, "execute").returns(Promise.resolve({
        json: {data: {}}
      }));
    });

    it("should delete a collection", () => {
      getBlogBucket().deleteCollection("todelete");

      sinon.assert.calledWithMatch(requests.deleteRequest, "/buckets/blog/collections/todelete", {
        headers: {},
      });
    });

    it("should merge default options", () => {
      getBlogBucket({
        headers: {Foo: "Bar"},
        safe: true,
      }).deleteCollection("todelete", {headers: {Baz: "Qux"}});

      sinon.assert.calledWithMatch(requests.deleteRequest, "/buckets/blog/collections/todelete", {
        headers: {Foo: "Bar", Baz: "Qux"},
        safe: true,
      });
    });

    it("should accept a safe option", () => {
      getBlogBucket().deleteCollection("todelete", {safe: true});

      sinon.assert.calledWithMatch(requests.deleteRequest, "/buckets/blog/collections/todelete", {
        safe: true
      });
    });

    it("should extend request headers with optional ones", () => {
      getBlogBucket({headers: {Foo: "Bar"}})
        .deleteCollection("todelete", {headers: {Baz: "Qux"}});

      sinon.assert.calledWithMatch(requests.deleteRequest, "/buckets/blog/collections/todelete", {
        headers: {Foo: "Bar", Baz: "Qux"}
      });
    });
  });

  /** @test {Bucket#getPermissions} */
  describe("#getPermissions()", () => {
    beforeEach(() => {
      sandbox.stub(client, "execute").returns(Promise.resolve({
        data: {}, permissions: {"write": ["fakeperms"]}
      }));
    });

    it("should retrieve permissions", () => {
      const bucket = getBlogBucket();
      return bucket.getPermissions().should.become({"write": ["fakeperms"]});
    });

    it("should merge default options", () => {
      const bucket = getBlogBucket({
        headers: {Foo: "Bar"},
        safe: true,
      });

      return bucket.getPermissions({headers: {Baz: "Qux"}}).then(_ => {
        sinon.assert.calledWithMatch(client.execute, {
          path: "/buckets/blog",
          headers: { Baz: "Qux", Foo: "Bar" }
        });
      });
    });
  });

  /** @test {Bucket#setPermissions} */
  describe("#setPermissions()", () => {
    const fakePermissions = {
      read: [],
      write: []
    };

    beforeEach(() => {
      sandbox.stub(requests, "updateRequest");
      sandbox.stub(client, "execute").returns(Promise.resolve({
        data: {},
        permissions: fakePermissions
      }));
    });

    it("should set permissions", () => {
      getBlogBucket().setPermissions(fakePermissions);

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog", {
        permissions: fakePermissions
      });
    });

    it("should merge default options", () => {
      const bucket = getBlogBucket({
        headers: {Foo: "Bar"},
        safe: true,
      });

      bucket.setPermissions(fakePermissions, {headers: {Baz: "Qux"}});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog", {
        permissions: fakePermissions,
        data: {last_modified: undefined}
      }, {
        headers: {Foo: "Bar", Baz: "Qux"},
        safe: true,
      });
    });

    it("should accept a last_modified option", () => {
      const bucket = getBlogBucket({
        headers: {Foo: "Bar"},
        safe: true,
      });

      bucket.setPermissions(fakePermissions, {last_modified: 42});

      sinon.assert.calledWithMatch(requests.updateRequest, "/buckets/blog", {
        data: {last_modified: 42},
        permissions: fakePermissions
      }, {
        safe: true,
      });
    });

    it("should resolve with response data", () => {
      return getBlogBucket().setPermissions(fakePermissions)
        .should.eventually.have.property("permissions").eql(fakePermissions);
    });
  });

  /** @test {Bucket#batch} */
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
        batch: false,
      });
    });

    it("should merge default options", () => {
      const fn = batch => {};

      getBlogBucket({
        headers: {Foo: "Bar"},
        safe: true,
      }).batch(fn, {headers: {Baz: "Qux"}});

      sinon.assert.calledWith(client.batch, fn, {
        bucket: "blog",
        headers: {Foo: "Bar", Baz: "Qux"},
        safe: true,
        batch: false,
      });
    });
  });
});
