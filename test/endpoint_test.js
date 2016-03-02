import chai, { expect } from "chai";

import endpoint from "../src/endpoint";

chai.should();
chai.config.includeStack = true;


/** @test {endpoint} */
describe("endpoint()", () => {
  it("should provide a root endpoint", () => {
    expect(endpoint("root")).eql("/");
  });

  it("should provide a batch endpoint", () => {
    expect(endpoint("batch"))
      .eql("/batch");
  });

  it("should provide a bucket endpoint", () => {
    expect(endpoint("bucket", "foo"))
      .eql("/buckets/foo");
  });

  it("should provide a collection endpoint", () => {
    expect(endpoint("collection", "foo", "bar"))
      .eql("/buckets/foo/collections/bar");
  });

  it("should provide a records endpoint", () => {
    expect(endpoint("records", "foo", "bar", 42))
      .eql("/buckets/foo/collections/bar/records");
  });

  it("should provide a record endpoint", () => {
    expect(endpoint("record", "foo", "bar", 42))
      .eql("/buckets/foo/collections/bar/records/42");
  });
});
