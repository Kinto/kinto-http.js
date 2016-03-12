import chai, { expect } from "chai";

import * as requests from "../src/requests";
import { aggregate } from "../src/batch";

chai.should();
chai.config.includeStack = true;

describe("batch module", () => {
  describe("aggregate()", () => {
    it("should throw if responses length doesn't match requests one", () => {
      expect(() => aggregate([1], [1, 2]))
        .to.Throw(Error, /match/);
    });

    it("should return an object", () => {
      expect(aggregate([], [])).to.be.an("object");
    });

    it("should return an object with the expected keys", () => {
      expect(aggregate([], [])).to.include.keys([
        "published",
        "conflicts",
        "skipped",
        "errors",
      ]);
    });

    it("should expose HTTP 500 errors in the errors list", () => {
      const _requests = [
        requests.createRecord("foo", {id: 1}),
        requests.createRecord("foo", {id: 2}),
      ];
      const responses = [
        {status: 500, path: "path1", body: {err: 1}},
        {status: 503, path: "path2", body: {err: 2}},
      ];

      expect(aggregate(responses, _requests))
        .to.have.property("errors")
        .eql([
          {
            error: {err: 1},
            path: "path1",
            sent: _requests[0],
          },
          {
            error: {err: 2},
            path: "path2",
            sent: _requests[1],
          },
        ]);
    });

    it("should expose HTTP 200<=x<400 responses in the published list", () => {
      const _requests = [
        requests.createRecord("foo", {id: 1}),
        requests.createRecord("foo", {id: 2}),
      ];
      const responses = [
        {status: 200, body: {data: {id: 1}}},
        {status: 201, body: {data: {id: 2}}},
      ];

      expect(aggregate(responses, _requests))
        .to.have.property("published")
        .eql(responses.map(r => r.body));
    });

    it("should expose HTTP 404 responses in the skipped list", () => {
      const _requests = [
        requests.createRecord("foo", {id: 1}),
        requests.createRecord("foo", {id: 2}),
      ];
      const responses = [
        {status: 404, body: _requests[0]},
        {status: 404, body: _requests[1]},
      ];

      expect(aggregate(responses, _requests))
        .to.have.property("skipped")
        .eql(responses.map(r => r.body));
    });

    it("should expose HTTP 412 responses in the conflicts list", () => {
      const _requests = [
        requests.createRecord("foo", {id: 1}),
        requests.createRecord("foo", {id: 2}),
      ];
      const responses = [
        {status: 412, body: {details: {existing: {remote: true}}}},
        {status: 412, body: {}},
      ];

      expect(aggregate(responses, _requests))
        .to.have.property("conflicts")
        .eql([
          {
            type: "outgoing",
            local: _requests[0].body,
            remote: {remote: true}
          },
          {
            type: "outgoing",
            local: _requests[1].body,
            remote: null
          },
        ]);
    });

    describe("Heterogeneous combinations", () => {
      let _requests, results;

      beforeEach(() => {
        _requests = [
          requests.createRecord("foo", {id: 1}),
          requests.createRecord("foo", {id: 2}),
          requests.createRecord("foo", {id: 3}),
          requests.createRecord("foo", {id: 4}),
        ];
        const responses = [
          {status: 500, path: "path1", body: {err: 1}},
          {status: 200, body: {data: {foo: "bar"}}},
          {status: 404, body: {data: {missing: true}}},
          {status: 412, body: {details: {existing: {remote: true}}}},
        ];

        results = aggregate(responses, _requests);
      });

      it("should list errors", () => {
        expect(results.errors).eql([
          {
            error: {err: 1},
            path: "path1",
            sent: _requests[0],
          }
        ]);
      });

      it("should list published data", () => {
        expect(results.published).eql([
          {data: {foo: "bar"}}
        ]);
      });

      it("should list conflicts", () => {
        expect(results.conflicts).eql([
          {
            type: "outgoing",
            local: {data: {id: 4}, permissions: {}},
            remote: {remote: true},
          }
        ]);
      });

      it("should list skips", () => {
        expect(results.skipped).eql([
          {
            data: {missing: true}
          }
        ]);
      });
    });
  });
});
