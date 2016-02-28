"use strict";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import KintoClient from "../src";
import Bucket from "../src/bucket";
import Collection from "../src/collection";


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

      sinon.assert.calledWithMatch(client.updateBucket, {id: "blog"}, {
        permissions: "fakeperms"
      });
    });

    it("should merge default options", () => {
      const bucket = getBlogBucket({
        headers: {Foo: "Bar"},
        safe: true,
      });

      bucket.setPermissions("fakeperms", {headers: {Baz: "Qux"}});

      sinon.assert.calledWithMatch(client.updateBucket, {id: "blog"}, {
        permissions: "fakeperms",
        headers: {Foo: "Bar", Baz: "Qux"},
        safe: true,
      });
    });

    it("should accept a last_modified option", () => {
      const bucket = getBlogBucket({
        headers: {Foo: "Bar"},
        safe: true,
      });

      bucket.setPermissions("fakeperms", {last_modified: 42});

      sinon.assert.calledWithMatch(client.updateBucket, {id: "blog"}, {
        permissions: "fakeperms",
        safe: true,
        last_modified: 42
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
