"use strict";

import chai, { expect } from "chai";

import * as requests from "../src/requests";


chai.should();
chai.config.includeStack = true;


describe("requests module", () => {
  describe("createBucket()", () => {
    it("should return a bucket creation request", () => {
      expect(requests.createBucket("foo")).eql({
        body: {
          permissions: {}
        },
        headers: {},
        method: "PUT",
        path: "/buckets/foo",
      });
    });

    it("should throw if bucketName is missing", () => {
      expect(() => requests.createBucket()).to.Throw(Error, /required/);
    });

    it("should accept a headers option", () => {
      expect(requests.createBucket("foo", {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.createBucket("foo", {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });
  });

  describe("createCollection()", () => {
    it("should return a collection creation request when an id is provided", () => {
      expect(requests.createCollection({id: "foo"})).eql({
        body: {
          permissions: {},
          data: {}
        },
        headers: {},
        method: "PUT",
        path: "/buckets/default/collections/foo",
      });
    });

    it("should return a collection creation request when no id is provided", () => {
      expect(requests.createCollection()).eql({
        body: {
          permissions: {},
          data: {}
        },
        headers: {},
        method: "POST",
        path: "/buckets/default/collections",
      });
    });

    it("should accept a bucket option", () => {
      expect(requests.createCollection({id: "foo"}, {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo");
    });

    it("should accept a headers option", () => {
      expect(requests.createCollection({id: "foo"}, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.createCollection({id: "foo"}, {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });
  });

  describe("updateCollection()", () => {
    const schema = {title: "foo schema"};

    it("should require a collection id", () => {
      expect(() => requests.updateCollection())
        .to.Throw(Error, /required/);
    });

    it("should return a collection update request", () => {
      expect(requests.updateCollection({id: "foo"}, {schema})).eql({
        body: {
          permissions: {},
          data: {id: "foo", schema}
        },
        headers: {},
        method: "PUT",
        path: "/buckets/default/collections/foo",
      });
    });

    it("should accept a bucket option", () => {
      expect(requests.updateCollection({id: "foo"}, {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo");
    });

    it("should accept a headers option", () => {
      expect(requests.updateCollection({id: "foo"}, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.updateCollection({id: "foo"}, {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });

    it("should accept a schema option", () => {
      expect(requests.updateCollection({id: "foo"}, {schema}))
        .to.have.property("body")
        .to.have.property("data")
        .to.have.property("schema").eql(schema);
    });

    it("should accept a patch option", () => {
      expect(requests.updateCollection({id: "foo"}, {schema, patch: true}))
        .to.have.property("method").eql("PATCH");
    });

    it("should handle metadata", () => {
      expect(requests.updateCollection({id: "foo", a: 1}))
        .to.have.property("body")
        .to.have.property("data").eql({id: "foo", a: 1});
    });
  });

  describe("deleteCollection()", () => {
    it("should return a collection creation request when an id is provided", () => {
      expect(requests.deleteCollection({id: "foo"})).eql({
        body: {},
        headers: {},
        method: "DELETE",
        path: "/buckets/default/collections/foo",
      });
    });

    it("should accept a bucket option", () => {
      expect(requests.deleteCollection({id: "foo"}, {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo");
    });

    it("should accept a headers option", () => {
      expect(requests.deleteCollection({id: "foo"}, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });
  });

  describe("updateBucket()", () => {
    it("should require a bucket id", () => {
      expect(() => requests.updateBucket())
        .to.Throw(Error, /required/);
    });

    it("should return a bucket update request", () => {
      expect(requests.updateBucket("foo", {})).eql({
        body: {
          permissions: {},
          data: {}
        },
        headers: {},
        method: "PUT",
        path: "/buckets/foo",
      });
    });

    it("should accept a headers option", () => {
      expect(requests.updateBucket("foo", {}, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.updateBucket("foo", {}, {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });

    it("should handle metadata", () => {
      expect(requests.updateBucket("foo", {a: 1}))
        .to.have.property("body")
        .to.have.property("data").eql({a: 1});
    });
  });

  describe("createRecord()", () => {
    const record = {title: "foo"};

    it("should throw if collName is missing", () => {
      expect(() => requests.createRecord())
        .to.Throw(Error, /required/);
    });

    it("should return a record creation request", () => {
      expect(requests.createRecord("foo", record)).eql({
        body: {
          permissions: {},
          data: record
        },
        headers: {},
        method: "POST",
        path: "/buckets/default/collections/foo/records",
      });
    });

    it("should accept a bucket option", () => {
      expect(requests.createRecord("foo", record, {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo/records");
    });

    it("should accept a headers option", () => {
      expect(requests.createRecord("foo", record, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.createRecord("foo", record, {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });

    describe("should add cache headers when the safe option is true", () => {
      it("for a record with no last_modified", () => {
        expect(requests.createRecord("foo", record, {safe: true}))
          .to.have.property("headers")
          .eql({"If-None-Match": "*"});
      });

      it("for a record with last_modified set", () => {
        const existingRecord = {...record, last_modified: 42};
        expect(requests.createRecord("foo", existingRecord, {safe: true}))
          .to.have.property("headers")
          .eql({"If-Match": "\"42\""});
      });
    });
  });

  describe("updateRecord()", () => {
    const record = {id: 1, title: "foo"};

    it("should throw if collName is missing", () => {
      expect(() => requests.updateRecord())
        .to.Throw(Error, /required/);
    });

    it("should return a record creation request", () => {
      expect(requests.updateRecord("foo", record)).eql({
        body: {
          permissions: {},
          data: record
        },
        headers: {},
        method: "PUT",
        path: "/buckets/default/collections/foo/records/1",
      });
    });

    it("should accept a bucket option", () => {
      expect(requests.updateRecord("foo", record, {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo/records/1");
    });

    it("should accept a headers option", () => {
      expect(requests.updateRecord("foo", record, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.updateRecord("foo", record, {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });

    it("should accept a patch option", () => {
      expect(requests.updateRecord("foo", record, {patch: true}))
        .to.have.property("method").eql("PATCH");
    });

    describe("should add cache headers when the safe option is true", () => {
      it("for a record with no last_modified", () => {
        expect(requests.updateRecord("foo", record, {safe: true}))
          .to.have.property("headers")
          .eql({"If-None-Match": "*"});
      });

      it("for a record with last_modified set", () => {
        const existingRecord = {...record, last_modified: 42};
        expect(requests.updateRecord("foo", existingRecord, {safe: true}))
          .to.have.property("headers")
          .eql({"If-Match": "\"42\""});
      });
    });
  });

  describe("deleteRecord()", () => {
    it("should throw if collName is missing", () => {
      expect(() => requests.deleteRecord())
        .to.Throw(Error, /required/);
    });

    it("should return a record creation request", () => {
      expect(requests.deleteRecord("foo", 42)).eql({
        body: {data: {last_modified: undefined}},
        headers: {},
        method: "DELETE",
        path: "/buckets/default/collections/foo/records/42",
      });
    });

    it("should accept a bucket option", () => {
      expect(requests.deleteRecord("foo", 42, {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo/records/42");
    });

    it("should accept a headers option", () => {
      expect(requests.deleteRecord("foo", 42, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    describe("should add cache headers when the safe option is true", () => {
      it("for a record with no last_modified", () => {
        expect(requests.deleteRecord("foo", 42, {safe: true}))
          .to.have.property("headers")
          .eql({"If-None-Match": "*"});
      });

      it("for a record with a last_modified option set", () => {
        expect(requests.deleteRecord("foo", 1337, {
          safe: true,
          lastModified: 42
        }))
          .to.have.property("headers")
          .eql({"If-Match": "\"42\""});
      });
    });
  });
});
