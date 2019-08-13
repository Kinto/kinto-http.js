"use strict";

import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { EventEmitter } from "events";
import { fakeServerResponse } from "./test_utils.js";
import HTTP from "../src/http";
import {
  NetworkTimeoutError,
  ServerResponse,
  UnparseableResponseError,
} from "../src/errors";

chai.use(chaiAsPromised);
chai.should();
chai.config.includeStack = true;

/** @test {HTTP} */
describe("HTTP class", () => {
  let sandbox, events, http;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    events = new EventEmitter();
    http = new HTTP(events, { timeout: 100 });
  });

  afterEach(() => sandbox.restore());

  /** @test {HTTP#constructor} */
  describe("#constructor", () => {
    it("should expose a passed events instance", () => {
      const events = new EventEmitter();
      const http = new HTTP(events);
      expect(http.events).to.eql(events);
    });

    it("should accept a requestMode option", () => {
      expect(
        new HTTP(events, {
          requestMode: "no-cors",
        }).requestMode
      ).eql("no-cors");
    });

    it("should complain if an events handler is not provided", () => {
      expect(() => {
        new HTTP();
      }).to.Throw(Error, /No events handler provided/);
    });
  });

  /** @test {HTTP#request} */
  describe("#request()", () => {
    describe("Request headers", () => {
      beforeEach(() => {
        sandbox.stub(global, "fetch").returns(fakeServerResponse(200, {}, {}));
      });

      it("should set default headers", () => {
        http.request("/");

        expect(fetch.firstCall.args[1].headers).eql(
          HTTP.DEFAULT_REQUEST_HEADERS
        );
      });

      it("should merge custom headers with default ones", () => {
        http.request("/", { headers: { Foo: "Bar" } });

        expect(fetch.firstCall.args[1].headers.Foo).eql("Bar");
      });

      it("should drop custom content-type header for multipart body", () => {
        http.request("/", {
          headers: { "Content-Type": "application/foo" },
          body: new FormData(),
        });

        expect(fetch.firstCall.args[1].headers["Content-Type"]).to.be.undefined;
      });
    });

    describe("Request CORS mode", () => {
      beforeEach(() => {
        sandbox.stub(global, "fetch").returns(fakeServerResponse(200, {}, {}));
      });

      it("should use default CORS mode", () => {
        new HTTP(events).request("/");

        expect(fetch.firstCall.args[1].mode).eql("cors");
      });

      it("should use configured custom CORS mode", () => {
        new HTTP(events, { requestMode: "no-cors" }).request("/");

        expect(fetch.firstCall.args[1].mode).eql("no-cors");
      });
    });

    describe("Succesful request", () => {
      beforeEach(() => {
        sandbox
          .stub(global, "fetch")
          .returns(fakeServerResponse(200, { a: 1 }, { b: 2 }));
      });

      it("should resolve with HTTP status", () => {
        return http
          .request("/")
          .then(res => res.status)
          .should.eventually.become(200);
      });

      it("should resolve with JSON body", () => {
        return http
          .request("/")
          .then(res => res.json)
          .should.eventually.become({ a: 1 });
      });

      it("should resolve with headers", () => {
        return http
          .request("/")
          .then(res => res.headers.get("b"))
          .should.eventually.become(2);
      });
    });

    describe("Request timeout", () => {
      beforeEach(() => {
        sandbox.stub(global, "fetch").returns(
          new Promise(resolve => {
            setTimeout(resolve, 20000);
          })
        );
      });

      it("should timeout the request", () => {
        return http.request("/").should.be.rejectedWith(NetworkTimeoutError);
      });

      it("should show request properties in error", () => {
        return http
          .request("/", {
            mode: "cors",
            headers: {
              Authorization: "XXX",
              "User-agent": "mocha-test",
            },
          })
          .should.be.rejectedWith(
            'Timeout while trying to access / with {"mode":"cors","headers":{"accept":"application/json","authorization":"**** (suppressed)","content-type":"application/json","user-agent":"mocha-test"}}'
          );
      });
    });

    describe("No content response", () => {
      it("should resolve with null JSON if Content-Length header is missing", () => {
        sandbox
          .stub(global, "fetch")
          .returns(fakeServerResponse(200, null, {}));

        return http
          .request("/")
          .then(res => res.json)
          .should.eventually.become(null);
      });
    });

    describe("Malformed JSON response", () => {
      it("should reject with an appropriate message", () => {
        sandbox.stub(global, "fetch").returns(
          Promise.resolve({
            status: 200,
            headers: {
              get(name) {
                if (name !== "Alert") {
                  return "fake";
                }
              },
            },
            text() {
              return Promise.resolve("an example of invalid JSON");
            },
          })
        );

        return http
          .request("/")
          .should.be.rejectedWith(
            UnparseableResponseError,
            /HTTP 200; SyntaxError: Unexpected token.+an example of invalid JSON/
          );
      });
    });

    describe("Business error responses", () => {
      it("should reject on status code > 400", () => {
        sandbox.stub(global, "fetch").returns(
          fakeServerResponse(400, {
            code: 400,
            details: [
              {
                description: "data is missing",
                location: "body",
                name: "data",
              },
            ],
            errno: 107,
            error: "Invalid parameters",
            message: "data is missing",
          })
        );

        return http
          .request("/")
          .should.be.rejectedWith(
            ServerResponse,
            /HTTP 400 Invalid parameters: Invalid request parameter \(data is missing\)/
          );
      });

      it("should expose JSON error bodies", () => {
        const errorBody = {
          code: 400,
          details: [
            {
              description: "data is missing",
              location: "body",
              name: "data",
            },
          ],
          errno: 107,
          error: "Invalid parameters",
          message: "data is missing",
        };
        sandbox
          .stub(global, "fetch")
          .returns(fakeServerResponse(400, errorBody));

        return http
          .request("/")
          .should.be.rejectedWith(ServerResponse)
          .and.eventually.deep.property("data", errorBody);
      });

      it("should reject on status code > 400 even with empty body", () => {
        sandbox.stub(global, "fetch").resolves({
          status: 400,
          statusText: "Cake Is A Lie",
          headers: {
            get(name) {
              if (name === "Content-Length") {
                return 0;
              }
            },
          },
          text() {
            return Promise.resolve("");
          },
        });

        return http
          .request("/")
          .should.be.rejectedWith(ServerResponse, /HTTP 400 Cake Is A Lie$/);
      });
    });

    describe("Deprecation header", () => {
      const eolObject = {
        code: "soft-eol",
        url: "http://eos-url",
        message: "This service will soon be decommissioned",
      };

      beforeEach(() => {
        sandbox.stub(console, "warn");
        sandbox.stub(events, "emit");
      });

      it("should handle deprecation header", () => {
        sandbox
          .stub(global, "fetch")
          .returns(
            fakeServerResponse(200, {}, { Alert: JSON.stringify(eolObject) })
          );

        return http.request("/").then(_ => {
          sinon.assert.calledOnce(console.warn);
          sinon.assert.calledWithExactly(
            console.warn,
            eolObject.message,
            eolObject.url
          );
        });
      });

      it("should handle deprecation header parse error", () => {
        sandbox
          .stub(global, "fetch")
          .returns(fakeServerResponse(200, {}, { Alert: "dafuq" }));

        return http.request("/").then(_ => {
          sinon.assert.calledOnce(console.warn);
          sinon.assert.calledWithExactly(
            console.warn,
            "Unable to parse Alert header message",
            "dafuq"
          );
        });
      });

      it("should emit a deprecated event on Alert header", () => {
        sandbox
          .stub(global, "fetch")
          .returns(
            fakeServerResponse(200, {}, { Alert: JSON.stringify(eolObject) })
          );

        return http.request("/").then(_ => {
          expect(events.emit.firstCall.args[0]).eql("deprecated");
          expect(events.emit.firstCall.args[1]).eql(eolObject);
        });
      });
    });

    describe("Backoff header handling", () => {
      beforeEach(() => {
        // Make Date#getTime always returning 1000000, for predictability
        sandbox.stub(Date.prototype, "getTime").returns(1000 * 1000);
        sandbox.stub(events, "emit");
      });

      it("should emit a backoff event on set Backoff header", () => {
        sandbox
          .stub(global, "fetch")
          .returns(fakeServerResponse(200, {}, { Backoff: "1000" }));

        return http.request("/").then(_ => {
          expect(events.emit.firstCall.args[0]).eql("backoff");
          expect(events.emit.firstCall.args[1]).eql(2000000);
        });
      });

      it("should emit a backoff event even on error responses", () => {
        sandbox
          .stub(global, "fetch")
          .returns(fakeServerResponse(503, {}, { Backoff: "1000" }));

        return http.request("/").should.be.rejected.then(() => {
          expect(events.emit.firstCall.args[0]).eql("backoff");
          expect(events.emit.firstCall.args[1]).eql(2000000);
        });
      });

      it("should emit a backoff event on missing Backoff header", () => {
        sandbox.stub(global, "fetch").returns(fakeServerResponse(200, {}, {}));

        return http.request("/").then(_ => {
          expect(events.emit.firstCall.args[0]).eql("backoff");
          expect(events.emit.firstCall.args[1]).eql(0);
        });
      });
    });

    describe("Retry-After header handling", () => {
      describe("Event", () => {
        beforeEach(() => {
          // Make Date#getTime always returning 1000000, for predictability
          sandbox.stub(Date.prototype, "getTime").returns(1000 * 1000);
          sandbox.stub(events, "emit");
        });

        it("should emit a retry-after event when Retry-After is set", () => {
          sandbox
            .stub(global, "fetch")
            .returns(fakeServerResponse(200, {}, { "Retry-After": "1000" }));

          return http.request("/", {}, { retry: 0 }).then(_ => {
            expect(events.emit.lastCall.args[0]).eql("retry-after");
            expect(events.emit.lastCall.args[1]).eql(2000000);
          });
        });
      });

      describe("Retry loop", () => {
        let fetch;

        beforeEach(() => {
          fetch = sandbox.stub(global, "fetch");
          // Avoid actually waiting real time for retries in test suites.
          // We can't use Sinon fakeTimers since we can't tick the fake
          // clock at the right moment (just after request failure).
          sandbox
            .stub(global, "setTimeout")
            .callsFake((fn, time) => setImmediate(fn));
        });

        it("should not retry the request by default", () => {
          fetch.returns(fakeServerResponse(503, {}, { "Retry-After": "1" }));
          return http
            .request("/")
            .should.eventually.be.rejectedWith(Error, /HTTP 503/);
        });

        it("should retry the request if specified", () => {
          const success = { success: true };
          fetch
            .onCall(0)
            .returns(fakeServerResponse(503, {}, { "Retry-After": "1" }));
          fetch.onCall(1).returns(fakeServerResponse(200, success));
          return http
            .request("/", {}, { retry: 1 })
            .then(res => res.json)
            .should.eventually.become(success);
        });

        it("should error when retries are exhausted", () => {
          fetch
            .onCall(0)
            .returns(fakeServerResponse(503, {}, { "Retry-After": "1" }));
          fetch
            .onCall(1)
            .returns(fakeServerResponse(503, {}, { "Retry-After": "1" }));
          fetch
            .onCall(2)
            .returns(fakeServerResponse(503, {}, { "Retry-After": "1" }));
          return http
            .request("/", {}, { retry: 2 })
            .should.eventually.be.rejectedWith(Error, /HTTP 503/);
        });
      });
    });
  });
});
