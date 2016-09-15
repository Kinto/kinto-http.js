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
        requests.createRequest("foo1", {data: {id: 1}}),
        requests.createRequest("foo2", {data: {id: 2}}),
      ];
      const responses = [
        {status: 500, body: {err: 1}},
        {status: 503, body: {err: 2}},
      ];

      expect(aggregate(responses, _requests))
        .to.have.property("errors")
        .eql([
          {
            error: {err: 1},
            path: "foo1",
            sent: _requests[0],
          },
          {
            error: {err: 2},
            path: "foo2",
            sent: _requests[1],
          },
        ]);
    });

    it("should expose HTTP 200<=x<400 responses in the published list", () => {
      const _requests = [
        requests.createRequest("foo", {data: {id: 1}}),
        requests.createRequest("foo", {data: {id: 2}}),
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
        requests.createRequest("records/123", {data: {id: 1}}),
        requests.createRequest("records/123", {data: {id: 2}}),
      ];
      const responses = [
        {status: 404, body: {errno: 110, code: 404, error: "Not found"}},
        {status: 404, body: {errno: 110, code: 404, error: "Not found"}},
      ];

      expect(aggregate(responses, _requests))
        .to.have.property("skipped")
        .eql(responses.map(r => ({
          data: {id: "123"},
          path: "records/123",
          error: r.body
        })));
    });

    it("should expose HTTP 412 responses in the conflicts list", () => {
      const _requests = [
        requests.createRequest("records/123", {data: {id: 1}}),
        requests.createRequest("records/123", {data: {id: 2}}),
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
      let _requests, responses, results;

      beforeEach(() => {
        _requests = [
          requests.createRequest("collections/abc/records/123", {data: {id: 1}}),
          requests.createRequest("collections/abc/records/123", {data: {id: 2}}),
          requests.createRequest("collections/abc/records/123", {data: {id: 3}}),
          requests.createRequest("collections/abc/records/123", {data: {id: 4, a: 1}}),
        ];
        responses = [
          {status: 500, path: "path1", body: {err: 1}},
          {status: 200, body: {data: {foo: "bar"}}},
          {status: 404, body: {errno: 110, code: 404, error: "Not found"}},
          {status: 412, body: {details: {existing: {remote: true}}}},
        ];

        results = aggregate(responses, _requests);
      });

      it("should list errors", () => {
        expect(results.errors).eql([
          {
            error: {err: 1},
            path: "collections/abc/records/123",
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
            local: {
              data: {id: 4, a: 1},
              permissions: undefined
            },
            remote: {remote: true},
          }
        ]);
      });

      it("should list skips", () => {
        expect(results.skipped).eql([
          {
            data: {id: "123"},
            path: "collections/abc/records/123",
            error: responses[2].body
          }
        ]);
      });
    });
  });
});
