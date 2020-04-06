import chai, { expect } from "chai";

import Endpoints from "../src/endpoints";

chai.should();
chai.config.includeStack = true;

/** @test {endpoint} */
describe("endpoint()", () => {
  it("should provide a root endpoint", () => {
    expect(Endpoints.root()).eql("/");
  });

  it("should provide a batch endpoint", () => {
    expect(Endpoints.batch()).eql("/batch");
  });

  it("should provide a bucket endpoint", () => {
    expect(Endpoints.bucket("foo")).eql("/buckets/foo");
  });

  it("should provide a collection endpoint", () => {
    expect(Endpoints.collection("foo", "bar")).eql(
      "/buckets/foo/collections/bar"
    );
  });

  it("should provide a records endpoint", () => {
    expect(Endpoints.record("foo", "bar")).eql(
      "/buckets/foo/collections/bar/records"
    );
  });

  it("should provide a record endpoint", () => {
    expect(Endpoints.record("foo", "bar", "42")).eql(
      "/buckets/foo/collections/bar/records/42"
    );
  });

  it("should provide a permissions endpoint", () => {
    expect(Endpoints.permissions()).eql("/permissions");
  });
});
