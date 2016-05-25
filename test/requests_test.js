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
          data: {},
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

    it("should support a safe option", () => {
      expect(requests.createBucket({id: "foo"}, {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-None-Match").eql("*");
    });
  });

  describe("deleteBucket()", () => {
    it("should return a bucket deletion request when an id is provided", () => {
      expect(requests.deleteBucket({id: "foo"})).eql({
        headers: {},
        method: "DELETE",
        path: "/buckets/foo",
      });
    });

    it("should accept a headers option", () => {
      expect(requests.deleteBucket({id: "foo"}, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should raise for safe with no last_modified passed", () => {
      expect(() => requests.deleteBucket({id: "foo"}, {safe: true}))
        .to.Throw(Error, /requires a last_modified/);
    });

    it("should support a safe option with a resource last_modified", () => {
      expect(requests.deleteBucket({id: "foo", last_modified: 42}, {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });

    it("should support a safe option with a last_modified option", () => {
      expect(requests.deleteBucket({id: "foo"}, {safe: true, last_modified: 42}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });
  });

  describe("#deleteBuckets()", () => {
    it("should return a bucket deletion request when an id is provided", () => {
      expect(requests.deleteBuckets()).eql({
        headers: {},
        method: "DELETE",
        path: "/buckets",
      });
    });

    it("should accept a headers option", () => {
      expect(requests.deleteBuckets({headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should raise for safe with no last_modified passed", () => {
      expect(() => requests.deleteBuckets({safe: true}))
        .to.Throw(Error, /requires a last_modified/);
    });

    it("should support a safe option with a last_modified option", () => {
      expect(requests.deleteBuckets({safe: true, last_modified: 42}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });
  });

  describe("createCollection()", () => {
    it("should return a collection creation request when an id is provided", () => {
      expect(requests.createCollection("foo")).eql({
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
      expect(requests.createCollection("foo", {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo");
    });

    it("should accept a headers option", () => {
      expect(requests.createCollection("foo", {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.createCollection("foo", {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });

    it("should support a safe option", () => {
      expect(requests.createCollection("foo", {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-None-Match").eql("*");
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

    it("should handle metadata from resource body", () => {
      expect(requests.updateCollection({id: "foo", a: 1}))
        .to.have.property("body")
        .to.have.property("data").eql({id: "foo", a: 1});
    });

    it("should handle metadata from dedicated option", () => {
      expect(requests.updateCollection({id: "foo"}, {metadata: {a: 1}}))
        .to.have.property("body")
        .to.have.property("data").eql({id: "foo", a: 1});
    });

    it("should support a safe option with no last_modified passed", () => {
      expect(requests.updateCollection({id: "foo"}, {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-None-Match").eql("*");
    });

    it("should support a safe option with a last_modified passed", () => {
      expect(requests.updateCollection({id: "foo", last_modified: 42}, {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });
  });

  describe("deleteCollection()", () => {
    it("should return a collection deletion request when an id is provided", () => {
      expect(requests.deleteCollection({id: "foo"})).eql({
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

    it("should raise for safe with no last_modified passed", () => {
      expect(() => requests.deleteCollection({id: "foo"}, {safe: true}))
        .to.Throw(Error, /requires a last_modified/);
    });

    it("should support a safe option with a resource last_modified", () => {
      expect(requests.deleteCollection({id: "foo", last_modified: 42}, {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });

    it("should support a safe option with a last_modified option", () => {
      expect(requests.deleteCollection({id: "foo"}, {safe: true, last_modified: 42}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });
  });

  describe("updateBucket()", () => {
    it("should require a bucket id", () => {
      expect(() => requests.updateBucket())
        .to.Throw(Error, /required/);
    });

    it("should return a bucket update request", () => {
      expect(requests.updateBucket({id: "foo"})).eql({
        body: {
          permissions: {},
          data: {id: "foo"}
        },
        headers: {},
        method: "PUT",
        path: "/buckets/foo",
      });
    });

    it("should accept a headers option", () => {
      expect(requests.updateBucket({id: "foo"}, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    it("should accept a permissions option", () => {
      const permissions = {read: ["github:n1k0"]};
      expect(requests.updateBucket({id: "foo"}, {permissions}))
        .to.have.property("body")
        .to.have.property("permissions").eql(permissions);
    });

    it("should handle metadata", () => {
      expect(requests.updateBucket({id: "foo", a: 1}))
        .to.have.property("body")
        .to.have.property("data").eql({id: "foo", a: 1});
    });

    it("should support a safe option with a resource last_modified", () => {
      expect(requests.updateBucket({id: "foo", last_modified: 42}, {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });

    it("should support a safe option with a last_modified option", () => {
      expect(requests.updateBucket({id: "foo"}, {safe: true, last_modified: 42}))
        .to.have.property("headers")
        .to.have.property("If-Match").eql("\"42\"");
    });

    it("should support a safe option with no last_modified", () => {
      expect(requests.updateBucket({id: "foo"}, {safe: true}))
        .to.have.property("headers")
        .to.have.property("If-None-Match").eql("*");
    });
  });

  describe("createRecord()", () => {
    it("should throw if collName is missing", () => {
      expect(() => requests.createRecord())
        .to.Throw(Error, /required/);
    });

    describe("No record id provided", () => {
      const record = {title: "foo"};

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
          .to.have.property("path")
          .eql("/buckets/custom/collections/foo/records");
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

      it("should support a safe option", () => {
        expect(requests.createRecord("foo", record, {safe: true}))
          .to.have.property("headers")
          .to.have.property("If-None-Match").eql("*");
      });
    });

    describe("Record id provided", () => {
      const record = {id: "37f727ed-c8c4-461b-80ac-de874992165c", title: "foo"};

      it("should return a record creation request", () => {
        expect(requests.createRecord("foo", record)).eql({
          body: {
            permissions: {},
            data: record
          },
          headers: {},
          method: "PUT",
          path: `/buckets/default/collections/foo/records/${record.id}`,
        });
      });

      it("should accept a bucket option", () => {
        expect(requests.createRecord("foo", record, {bucket: "custom"}))
          .to.have.property("path")
          .eql(`/buckets/custom/collections/foo/records/${record.id}`);
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

      it("should support a safe option", () => {
        expect(requests.createRecord("foo", record, {safe: true}))
          .to.have.property("headers")
          .to.have.property("If-None-Match").eql("*");
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
      it("for a record with no last_modified set", () => {
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

    it("should throw if record is not an object", () => {
      expect(() => requests.deleteRecord("foo", "invalid"))
        .to.Throw(Error, /required/);
    });

    it("should return a record creation request", () => {
      expect(requests.deleteRecord("foo", {id: 42})).eql({
        headers: {},
        method: "DELETE",
        path: "/buckets/default/collections/foo/records/42",
      });
    });

    it("should accept a bucket option", () => {
      expect(requests.deleteRecord("foo", {id: "42"}, {bucket: "custom"}))
        .to.have.property("path").eql("/buckets/custom/collections/foo/records/42");
    });

    it("should accept a headers option", () => {
      expect(requests.deleteRecord("foo", {id: "42"}, {headers: {Foo: "Bar"}}))
        .to.have.property("headers").eql({Foo: "Bar"});
    });

    describe("should add cache headers when the safe option is true", () => {
      it("should raise for safe with no last_modified passed", () => {
        expect(() => requests.deleteRecord("foo", {id: "42"}, {safe: true}))
          .to.Throw(Error, /requires a last_modified/);
      });

      it("for a record with a last_modified option set", () => {
        expect(requests.deleteRecord("foo", {id: "42", last_modified: 1337},
                                            {safe: true}))
          .to.have.property("headers")
          .eql({"If-Match": "\"1337\""});
      });
    });
  });
});
