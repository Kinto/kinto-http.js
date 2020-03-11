import endpoint from "../src/endpoint";

const { expect } = intern.getPlugin("chai");
intern.getPlugin("chai").should();
const { describe, it } = intern.getPlugin("interface.bdd");

/** @test {endpoint} */
describe("endpoint()", () => {
  it("should provide a root endpoint", () => {
    expect(endpoint.root()).eql("/");
  });

  it("should provide a batch endpoint", () => {
    expect(endpoint.batch()).eql("/batch");
  });

  it("should provide a bucket endpoint", () => {
    expect(endpoint.bucket("foo")).eql("/buckets/foo");
  });

  it("should provide a collection endpoint", () => {
    expect(endpoint.collection("foo", "bar")).eql(
      "/buckets/foo/collections/bar"
    );
  });

  it("should provide a records endpoint", () => {
    expect(endpoint.record("foo", "bar")).eql(
      "/buckets/foo/collections/bar/records"
    );
  });

  it("should provide a record endpoint", () => {
    expect(endpoint.record("foo", "bar", "42")).eql(
      "/buckets/foo/collections/bar/records/42"
    );
  });

  it("should provide a permissions endpoint", () => {
    expect(endpoint.permissions()).eql("/permissions");
  });
});
