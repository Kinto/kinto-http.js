import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { EventEmitter } from "events";
import { fakeServerResponse, Spy, Stub } from "./test_utils";
import KintoClient from "../src";
import KintoClientBase, {
  SUPPORTED_PROTOCOL_VERSION as SPV,
  PaginationResult,
} from "../src/base";
import * as requests from "../src/requests";
import Bucket from "../src/bucket";
import { HelloResponse, OperationResponse } from "../src/types";
import { KintoBatchResponse } from "../src/batch";

chai.use(chaiAsPromised);
chai.should();
chai.config.includeStack = true;

const FAKE_SERVER_URL = "http://fake-server/v1";

/** @test {KintoClient} */
describe("KintoClient", () => {
  let sandbox: sinon.SinonSandbox, api: KintoClient, events: EventEmitter;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    events = new EventEmitter();
    api = new KintoClient(FAKE_SERVER_URL, { events });
  });

  afterEach(() => {
    sandbox.restore();
  });

  /** @test {KintoClient#constructor} */
  describe("#constructor", () => {
    const sampleRemote = `http://test/${SPV}`;

    it("should check that `remote` is a string", () => {
      expect(
        () =>
          new KintoClient(42 as any, {
            events,
          })
      ).to.Throw(Error, /Invalid remote URL/);
    });

    it("should validate `remote` arg value", () => {
      expect(() => new KintoClient("http://nope")).to.Throw(
        Error,
        /The remote URL must contain the version/
      );
    });

    it("should strip any trailing slash", () => {
      expect(new KintoClient(sampleRemote).remote).eql(sampleRemote);
    });

    it("should expose a passed events instance option", () => {
      expect(new KintoClient(sampleRemote, { events }).events).to.eql(events);
    });

    it("should propagate its events property to child dependencies", () => {
      const api = new KintoClient(sampleRemote, { events });
      expect(api.http.events).eql(api.events);
    });

    it("should assign version value", () => {
      expect(new KintoClient(sampleRemote).version).eql(SPV);
      expect(new KintoClient(sampleRemote).version).eql(SPV);
    });

    it("should accept a headers option", () => {
      expect(
        new KintoClient(sampleRemote, {
          headers: { Foo: "Bar" },
        })["_headers"]
      ).eql({ Foo: "Bar" });
    });

    it("should validate protocol version", () => {
      expect(() => new KintoClient("http://test/v999")).to.Throw(
        Error,
        /^Unsupported protocol version/
      );
    });

    it("should propagate the requestMode option to the child HTTP instance", () => {
      const requestMode = "no-cors";
      expect(
        new KintoClient(sampleRemote, {
          requestMode,
        }).http.requestMode
      ).eql(requestMode);
    });

    it("should keep the default timeout in the child HTTP instance", () => {
      expect(new KintoClient(sampleRemote).http.timeout).eql(null);
    });

    it("should propagate the timeout option to the child HTTP instance", () => {
      const timeout = 1000;
      expect(
        new KintoClient(sampleRemote, {
          timeout,
        }).http.timeout
      ).eql(timeout);
    });

    it("should create an event emitter if none is provided", () => {
      expect(new KintoClient(sampleRemote).events).to.be.an.instanceOf(
        EventEmitter
      );
    });

    it("should expose provided event emitter as a property", () => {
      const events = new EventEmitter();
      expect(new KintoClient(sampleRemote, { events }).events).eql(events);
    });

    it("should accept a safe option", () => {
      const api = new KintoClient(sampleRemote, { safe: true });
      expect(api["_safe"]).eql(true);
    });
  });

  /** @test {KintoClient#setHeaders} */
  describe("#setHeaders", () => {
    let client: KintoClient;

    beforeEach(() => {
      client = new KintoClient(FAKE_SERVER_URL, {
        headers: { Foo: "Bar", Authorization: "Biz" },
      });
    });

    it("should override constructor headers", () => {
      client.setHeaders({
        Authorization: "Baz",
      });
      expect(client["_headers"]).eql({ Foo: "Bar", Authorization: "Baz" });
    });
  });

  /** @test {KintoClient#backoff} */
  describe("get backoff()", () => {
    it("should provide the remaining backoff time in ms if any", () => {
      // Make Date#getTime always returning 1000000, for predictability
      sandbox.stub(Date.prototype, "getTime").returns(1000 * 1000);
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, {}, { Backoff: "1000" }));

      return api.listBuckets().then(_ => expect(api.backoff).eql(1000000));
    });

    it("should provide no remaining backoff time when none is set", () => {
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, {}, {}));

      return api.listBuckets().then(_ => expect(api.backoff).eql(0));
    });
  });

  /** @test {KintoClient#bucket} */
  describe("#bucket()", () => {
    it("should return a Bucket instance", () => {
      expect(api.bucket("foo")).to.be.an.instanceOf(Bucket);
    });

    it("should propagate default req options to bucket instance", () => {
      const options = {
        safe: true,
        retry: 0,
        headers: { Foo: "Bar" },
        batch: false,
      };

      const bucket = api.bucket("foo", options);
      expect(bucket).property("_safe", options.safe);
      expect(bucket).property("_retry", options.retry);
      expect(bucket)
        .property("_headers")
        .eql(options.headers);
    });
  });

  /** @test {KintoClient#fetchServerInfo} */
  describe("#fetchServerInfo", () => {
    const fakeServerInfo: HelloResponse = {
      project_name: "",
      project_version: "",
      http_api_version: "",
      project_docs: "",
      url: "",
      settings: { readonly: false, batch_max_requests: 25 },
      capabilities: {},
    };

    it("should retrieve server settings on first request made", () => {
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, fakeServerInfo));

      return api.fetchServerInfo().should.eventually.become(fakeServerInfo);
    });

    it("should store server settings into the serverSettings property", () => {
      // api.serverSettings = { a: 1 };
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, fakeServerInfo));

      return api.fetchServerInfo().then(_ => {
        expect(api)
          .property("serverInfo")
          .deep.equal(fakeServerInfo);
      });
    });

    it("should not fetch server settings if they're cached already", () => {
      api.serverInfo = fakeServerInfo;
      const fetchStub = sandbox.stub(global as any, "fetch");

      api.fetchServerInfo();
      sinon.assert.notCalled(fetchStub);
    });

    it("should refresh server info if headers were changed", () => {
      api.serverInfo = fakeServerInfo;
      api.setHeaders({
        Authorization: "Baz",
      });
      expect(api.serverInfo).eql(null);
    });
  });

  /** @test {KintoClient#fetchServerSettings} */
  describe("#fetchServerSettings()", () => {
    const fakeServerInfo = { settings: { fake: true } };

    it("should retrieve server settings", () => {
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, fakeServerInfo));

      return api
        .fetchServerSettings()
        .should.eventually.have.property("fake")
        .eql(true);
    });
  });

  /** @test {KintoClient#fetchServerCapabilities} */
  describe("#fetchServerCapabilities()", () => {
    const fakeServerInfo = { capabilities: { fake: true } };

    it("should retrieve server capabilities", () => {
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, fakeServerInfo));

      return api
        .fetchServerCapabilities()
        .should.eventually.have.property("fake")
        .eql(true);
    });
  });

  /** @test {KintoClient#fetchUser} */
  describe("#fetchUser()", () => {
    const fakeServerInfo = { user: { fake: true } };

    it("should retrieve user information", () => {
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, fakeServerInfo));

      return api
        .fetchUser()
        .should.eventually.have.property("fake")
        .eql(true);
    });
  });

  /** @test {KintoClient#fetchHTTPApiVersion} */
  describe("#fetchHTTPApiVersion()", () => {
    const fakeServerInfo = { http_api_version: { fake: true } };

    it("should retrieve current API version", () => {
      sandbox
        .stub(global as any, "fetch")
        .returns(fakeServerResponse(200, fakeServerInfo));

      return api
        .fetchHTTPApiVersion()
        .should.eventually.have.property("fake")
        .eql(true);
    });
  });

  /** @test {KintoClient#batch} */
  describe("#batch", () => {
    beforeEach(() => {
      const fetchServerSettings = sandbox.stub().returns(
        Promise.resolve({
          batch_max_requests: 3,
        })
      );
      sandbox.stub(api, "fetchServerSettings").get(() => fetchServerSettings);
    });

    function executeBatch(fixtures: { [key: string]: any }[], options = {}) {
      return api
        .bucket("default")
        .collection("blog")
        .batch(batch => {
          for (const article of fixtures) {
            batch.createRecord(article);
          }
        }, options);
    }

    describe("Batch client setup", () => {
      it("should skip registering HTTP events", () => {
        const on = sandbox.spy();
        const api = new KintoClient(FAKE_SERVER_URL, { events: { on } as any });

        return api.batch(() => {}).then(() => sinon.assert.calledOnce(on));
      });
    });

    describe("server request", () => {
      let requestBody: any, requestHeaders: any, fetch: sinon.SinonStub;

      beforeEach(() => {
        fetch = sandbox.stub(global as any, "fetch");
        fetch.returns(fakeServerResponse(200, { responses: [] }));
      });

      it("should ensure server settings are fetched", () => {
        return api
          .batch((batch: KintoClientBase) => batch.createBucket("blog"))
          .then(_ => sinon.assert.called(api.fetchServerSettings as any));
      });

      describe("empty request list", () => {
        it("should not perform request on empty operation list", () => {
          // @ts-ignore
          api.batch(batch => {});

          sinon.assert.notCalled(fetch);
        });
      });

      describe("non-empty request list", () => {
        const fixtures = [
          { title: "art1" },
          { title: "art2" },
          { title: "art3" },
        ];

        beforeEach(() => {
          api["_headers"] = { Authorization: "Basic plop" };
          return api
            .bucket("default")
            .collection("blog")
            .batch(
              batch => {
                for (const article of fixtures) {
                  batch.createRecord(article);
                }
              },
              { headers: { Foo: "Bar" } }
            )
            .then(_ => {
              const request = fetch.firstCall.args[1];
              requestHeaders = request.headers;
              requestBody = JSON.parse(request.body);
            });
        });

        it("should call the batch endpoint", () => {
          sinon.assert.calledWithMatch(fetch, `/${SPV}/batch`);
        });

        it("should define main batch request default headers", () => {
          expect(requestBody.defaults.headers).eql({
            Authorization: "Basic plop",
            Foo: "Bar",
          });
        });

        it("should attach all batch request headers", () => {
          expect(requestHeaders.Authorization).eql("Basic plop");
        });

        it("should batch the expected number of requests", () => {
          expect(requestBody.requests.length).eql(3);
        });
      });

      describe("Safe mode", () => {
        const fixtures = [{ title: "art1" }, { title: "art2" }];

        it("should forward the safe option to resulting requests", () => {
          return api
            .bucket("default")
            .collection("blog")
            .batch(
              batch => {
                for (const article of fixtures) {
                  batch.createRecord(article);
                }
              },
              { safe: true }
            )
            .then(_ => {
              const { requests } = JSON.parse(fetch.firstCall.args[1].body);
              expect(
                requests.map(
                  (r: { headers: { [key: string]: string }[] }) => r.headers
                )
              ).eql([{ "If-None-Match": "*" }, { "If-None-Match": "*" }]);
            });
        });
      });

      describe("Retry", () => {
        const response = {
          status: 201,
          path: `/${SPV}/buckets/blog/collections/articles/records`,
          body: { data: { id: 1, title: "art" } },
        };

        beforeEach(() => {
          sandbox.stub(global, "setTimeout").callsFake(setImmediate as any);

          fetch
            .onCall(0)
            .returns(fakeServerResponse(503, {}, { "Retry-After": "1" }));
          fetch.onCall(1).returns(
            fakeServerResponse(200, {
              responses: [response],
            })
          );
        });

        it("should retry the request if option is specified", () => {
          return api
            .bucket("default")
            .collection("blog")
            .batch(batch => batch.createRecord({}), {
              retry: 1,
            })
            .then(r => expect((r as OperationResponse[])[0]).eql(response));
        });
      });
    });

    describe("server response", () => {
      const fixtures = [
        { id: "1", title: "art1" },
        { id: "2", title: "art2" },
      ];

      it("should reject on HTTP 400", () => {
        sandbox.stub(global as any, "fetch").returns(
          fakeServerResponse(400, {
            error: true,
            errno: 117,
            message: "http 400",
          })
        );

        return executeBatch(fixtures).should.eventually.be.rejectedWith(
          Error,
          /HTTP 400/
        );
      });

      it("should reject on HTTP error status code", () => {
        sandbox.stub(global as any, "fetch").returns(
          fakeServerResponse(500, {
            error: true,
            message: "http 500",
          })
        );

        return executeBatch(fixtures).should.eventually.be.rejectedWith(
          Error,
          /HTTP 500/
        );
      });

      it("should expose succesful subrequest responses", () => {
        const responses = [
          {
            status: 201,
            path: `/${SPV}/buckets/blog/collections/articles/records`,
            body: { data: fixtures[0] },
          },
          {
            status: 201,
            path: `/${SPV}/buckets/blog/collections/articles/records`,
            body: { data: fixtures[1] },
          },
        ];
        sandbox
          .stub(global as any, "fetch")
          .returns(fakeServerResponse(200, { responses }));

        return executeBatch(fixtures).should.eventually.become(responses);
      });

      it("should expose failing subrequest responses", () => {
        const missingRemotely = fixtures[0];
        const responses = [
          {
            status: 404,
            path: `/${SPV}/buckets/blog/collections/articles/records/1`,
            body: missingRemotely,
          },
        ];
        sandbox
          .stub(global as any, "fetch")
          .returns(fakeServerResponse(200, { responses }));

        return executeBatch(fixtures).should.eventually.become(responses);
      });

      it("should resolve with encountered HTTP 500", () => {
        const responses = [
          {
            status: 500,
            path: `/${SPV}/buckets/blog/collections/articles/records/1`,
            body: { 500: true },
          },
        ];
        sandbox
          .stub(global as any, "fetch")
          .returns(fakeServerResponse(200, { responses }));

        return executeBatch(fixtures).should.eventually.become(responses);
      });

      it("should expose encountered HTTP 412", () => {
        const responses = [
          {
            status: 412,
            path: `/${SPV}/buckets/blog/collections/articles/records/1`,
            body: { details: { existing: { title: "foo" } } },
          },
        ];
        sandbox
          .stub(global as any, "fetch")
          .returns(fakeServerResponse(200, { responses }));

        return executeBatch(fixtures).should.eventually.become(responses);
      });
    });

    describe("Chunked requests", () => {
      // 4 operations, one more than the test limit which is 3
      const fixtures = [
        { id: "1", title: "foo" },
        { id: "2", title: "bar" },
        { id: "3", title: "baz" },
        { id: "4", title: "qux" },
      ];

      it("should chunk batch requests", () => {
        sandbox
          .stub(global as any, "fetch")
          .onFirstCall()
          .returns(
            fakeServerResponse(200, {
              responses: [
                { status: 200, body: { data: 1 } },
                { status: 200, body: { data: 2 } },
                { status: 200, body: { data: 3 } },
              ],
            })
          )
          .onSecondCall()
          .returns(
            fakeServerResponse(200, {
              responses: [{ status: 200, body: { data: 4 } }],
            })
          );
        return executeBatch(fixtures)
          .then(res =>
            (res as OperationResponse[]).map(response => response.body.data)
          )
          .should.become([1, 2, 3, 4]);
      });

      it("should not chunk batch requests if setting is falsy", () => {
        const fetchServerSettings = sandbox.stub().returns(
          Promise.resolve({
            batch_max_requests: 0,
          })
        );
        sandbox.stub(api, "fetchServerSettings").get(() => fetchServerSettings);
        const fetchStub = sandbox.stub(global as any, "fetch").returns(
          fakeServerResponse(200, {
            responses: [],
          })
        );
        return executeBatch(fixtures).then(_ =>
          sinon.assert.calledOnce(fetchStub)
        );
      });

      it("should map initial records to conflict objects", () => {
        sandbox
          .stub(global as any, "fetch")
          .onFirstCall()
          .returns(
            fakeServerResponse(200, {
              responses: [
                { status: 412, body: { details: { existing: { id: 1 } } } },
                { status: 412, body: { details: { existing: { id: 2 } } } },
                { status: 412, body: {} },
              ],
            })
          )
          .onSecondCall()
          .returns(
            fakeServerResponse(200, {
              responses: [
                { status: 412, body: { details: { existing: { id: 4 } } } },
              ],
            })
          );
        return executeBatch(fixtures)
          .then(res =>
            (res as OperationResponse[]).map(response => response.status)
          )
          .should.become([412, 412, 412, 412]);
      });

      it("should chunk batch requests concurrently", () => {
        sandbox
          .stub(global as any, "fetch")
          .onFirstCall()
          .returns(
            new Promise(resolve => {
              function onTimeout() {
                resolve(
                  fakeServerResponse(200, {
                    responses: [
                      { status: 200, body: { data: 1 } },
                      { status: 200, body: { data: 2 } },
                      { status: 200, body: { data: 3 } },
                    ],
                  })
                );
              }
              setTimeout(onTimeout, 100);
            })
          )
          .onSecondCall()
          .returns(
            new Promise(resolve => {
              function onTimeout() {
                resolve(
                  fakeServerResponse(200, {
                    responses: [{ status: 200, body: { data: 4 } }],
                  })
                );
              }
              setTimeout(onTimeout, 5);
            })
          );
        return executeBatch(fixtures)
          .then(res =>
            (res as OperationResponse[]).map(response => response.body.data)
          )
          .should.become([1, 2, 3, 4]);
      });
    });

    describe("Aggregate mode", () => {
      const fixtures = [
        { title: "art1" },
        { title: "art2" },
        { title: "art3" },
        { title: "art4" },
      ];

      it("should resolve with an aggregated result object", () => {
        const responses: KintoBatchResponse[] = [];
        sandbox
          .stub(global as any, "fetch")
          .returns(fakeServerResponse(200, { responses }));
        const batchModule = require("../src/batch");
        const aggregate = sandbox.stub(batchModule, "aggregate");

        return executeBatch(fixtures, { aggregate: true }).then(_ => {
          sinon.assert.calledWith(aggregate, responses);
        });
      });
    });
  });

  /** @test {KintoClient#execute} */
  describe("#execute()", () => {
    it("should ensure passing defined allowed defined request options", () => {
      sinon.stub(api, "fetchServerInfo").returns(Promise.resolve({} as any));
      const request = sinon
        .stub(api.http, "request")
        .returns(Promise.resolve({} as any));

      return api.execute({ path: "/foo", garbage: true } as any).then(() => {
        sinon.assert.calledWith(
          request,
          "http://fake-server/v1/foo",
          {},
          { retry: 0 }
        );
      });
    });
  });

  /** @test {KintoClient#paginatedList} */
  describe("#paginatedList()", () => {
    const ETag = '"42"';
    const path = "/some/path";
    let executeStub: Stub<typeof api.execute>;

    describe("No pagination", () => {
      beforeEach(() => {
        // Since listRecords use `raw: true`, stub with full response:
        executeStub = sandbox.stub(api, "execute").returns(
          Promise.resolve({
            json: { data: [{ a: 1 }] },
            headers: {
              get: (name: string) => {
                if (name === "ETag") {
                  return ETag;
                }
              },
            },
          })
        );
      });

      it("should execute expected request", () => {
        api.paginatedList(path);

        sinon.assert.calledWithMatch(
          executeStub,
          { path: `${path}?_sort=-last_modified`, headers: {} },
          { raw: true }
        );
      });

      it("should sort records", () => {
        api.paginatedList(path, { sort: "title" });

        sinon.assert.calledWithMatch(
          executeStub,
          { path: `${path}?_sort=title`, headers: {} },
          { raw: true }
        );
      });

      it("should resolve with records list", () => {
        return api
          .paginatedList(path)
          .should.eventually.have.property("data")
          .eql([{ a: 1 }]);
      });

      it("should resolve with a next() function", () => {
        return api
          .paginatedList(path)
          .should.eventually.have.property("next")
          .to.be.a("function");
      });

      it("should support the since option", () => {
        api.paginatedList(path, { since: ETag });

        const qs = "_sort=-last_modified&_since=%2242%22";
        sinon.assert.calledWithMatch(executeStub, {
          path: `${path}?${qs}`,
          headers: {},
        });
      });

      it("should throw if the since option is invalid", () => {
        return api
          .paginatedList(path, { since: 123 } as any)
          .should.be.rejectedWith(
            Error,
            /Invalid value for since \(123\), should be ETag value/
          );
      });

      it("should resolve with the collection last_modified without quotes", () => {
        return api
          .paginatedList(path)
          .should.eventually.have.property("last_modified")
          .eql("42");
      });

      it("should resolve with the hasNextPage being set to false", () => {
        return api
          .paginatedList(path)
          .should.eventually.have.property("hasNextPage")
          .eql(false);
      });

      it("should pass fields through", () => {
        api.paginatedList(path, { fields: ["c", "d"] });

        sinon.assert.calledWithMatch(executeStub, {
          path: `${path}?_sort=-last_modified&_fields=c,d`,
          headers: {},
        });
      });
    });

    describe("Filtering", () => {
      let executeStub: Stub<typeof api.execute>;

      beforeEach(() => {
        executeStub = sandbox.stub(api, "execute").returns(
          Promise.resolve({
            json: { data: [] },
            headers: { get: () => {} },
          })
        );
      });

      it("should generate the expected filtering query string", () => {
        api.paginatedList(path, { sort: "x", filters: { min_y: 2, not_z: 3 } });

        const expectedQS = "min_y=2&not_z=3&_sort=x";
        sinon.assert.calledWithMatch(
          executeStub,
          { path: `${path}?${expectedQS}`, headers: {} },
          { raw: true }
        );
      });

      it("shouldn't need an explicit sort parameter", () => {
        api.paginatedList(path, { filters: { min_y: 2, not_z: 3 } });

        const expectedQS = "min_y=2&not_z=3&_sort=-last_modified";
        sinon.assert.calledWithMatch(
          executeStub,
          { path: `${path}?${expectedQS}`, headers: {} },
          { raw: true }
        );
      });
    });

    describe("Pagination", () => {
      let headersgetSpy: sinon.SinonStub;
      let executeStub: Stub<typeof api.execute>;

      it("should issue a request with the specified limit applied", () => {
        executeStub = sandbox.stub(api, "execute").returns(
          Promise.resolve({
            json: { data: [] },
            headers: { get: headersgetSpy },
          })
        );

        api.paginatedList(path, { limit: 2 });

        const expectedQS = "_sort=-last_modified&_limit=2";
        sinon.assert.calledWithMatch(
          executeStub,
          { path: `${path}?${expectedQS}`, headers: {} },
          { raw: true }
        );
      });

      it("should query for next page", () => {
        const { http } = api;
        headersgetSpy = sandbox.stub().returns("http://next-page/");
        sandbox.stub(api, "execute").returns(
          Promise.resolve({
            json: { data: [] },
            headers: { get: headersgetSpy },
          })
        );
        const requestStub = sandbox.stub(http, "request").returns(
          Promise.resolve({
            status: 200,
            headers: new Headers(),
            json: { data: [] },
          })
        );

        return api.paginatedList(path, { limit: 2, pages: 2 }).then(_ => {
          sinon.assert.calledWith(requestStub, "http://next-page/");
        });
      });

      it("should aggregate paginated results", () => {
        const { http } = api;
        sandbox
          .stub(http, "request")
          // first page
          .onFirstCall()
          .returns(
            Promise.resolve({
              status: 200,
              headers: new Headers({ "Next-Page": "http://next-page/" }),
              json: { data: [1, 2] },
            })
          )
          // second page
          .onSecondCall()
          .returns(
            Promise.resolve({
              status: 200,
              headers: new Headers(),
              json: { data: [3] },
            })
          );

        return api
          .paginatedList(path, { limit: 2, pages: 2 })
          .should.eventually.have.property("data")
          .eql([1, 2, 3]);
      });

      it("should resolve with the hasNextPage being set to true", () => {
        const { http } = api;
        sandbox
          .stub(http, "request")
          // first page
          .onFirstCall()
          .returns(
            Promise.resolve({
              status: 200,
              headers: new Headers({ "Next-Page": "http://next-page/" }),
              json: { data: [1, 2] },
            })
          );

        return api
          .paginatedList(path)
          .should.eventually.have.property("hasNextPage")
          .eql(true);
      });
    });

    describe("Batch mode", () => {
      it("should not attempt at consumming response headers ", () => {
        // Emulate an ongoing batch operation
        (api as any)._isBatch = true;

        return api.paginatedList(path).should.not.be.rejected;
      });
    });
  });

  /** @test {KintoClient#listPermissions} */
  describe("#listPermissions()", () => {
    const data: PaginationResult<{ id: string }> = {
      last_modified: "",
      data: [{ id: "a" }, { id: "b" }],
      next: () => {
        return Promise.resolve(
          ({} as unknown) as PaginationResult<{
            id: string;
          }>
        );
      },
      hasNextPage: false,
      totalRecords: 2,
    };
    let executeSpy: Spy<typeof api.execute>;

    describe("Capability available", () => {
      beforeEach(() => {
        api.serverInfo = {
          project_name: "",
          project_version: "",
          http_api_version: "",
          project_docs: "",
          url: "",
          settings: { readonly: false, batch_max_requests: 25 },
          capabilities: {
            permissions_endpoint: {
              description: "",
              url: "",
            },
          },
        };
        sandbox.stub(api, "paginatedList").returns(Promise.resolve(data));
        executeSpy = sinon.spy(api, "execute");
      });

      it("should execute expected request", () => {
        api.listPermissions().then(() => {
          sinon.assert.calledWithMatch(executeSpy, {
            path: "/permissions",
            headers: {},
          });
        });
      });

      it("should support passing custom headers", () => {
        api["_headers"] = { Foo: "Bar" };
        api.listPermissions({ headers: { Baz: "Qux" } }).then(() => {
          sinon.assert.calledWithMatch(executeSpy, {
            path: "/permissions",
            headers: { Foo: "Bar", Baz: "Qux" },
          });
        });
      });

      it("should resolve with a result object", () => {
        return api
          .listPermissions()
          .should.eventually.have.property("data")
          .eql(data.data);
      });
    });

    describe("Capability unavailable", () => {
      it("should reject with an error when the capability is not available", () => {
        api.serverInfo = {
          project_name: "",
          project_version: "",
          http_api_version: "",
          project_docs: "",
          url: "",
          settings: { readonly: false, batch_max_requests: 25 },
          capabilities: {},
        };

        return api
          .listPermissions()
          .should.be.rejectedWith(Error, /permissions_endpoint/);
      });
    });
  });

  /** @test {KintoClient#listBuckets} */
  describe("#listBuckets()", () => {
    const data: PaginationResult<{ id: string }> = {
      last_modified: "",
      data: [{ id: "a" }, { id: "b" }],
      next: () => {
        return Promise.resolve(
          ({} as unknown) as PaginationResult<{
            id: string;
          }>
        );
      },
      hasNextPage: false,
      totalRecords: 2,
    };
    let paginatedListStub: Stub<typeof api.paginatedList>;

    beforeEach(() => {
      paginatedListStub = sandbox
        .stub(api, "paginatedList")
        .returns(Promise.resolve(data));
    });

    it("should execute expected request", () => {
      api.listBuckets({ since: "42" });

      sinon.assert.calledWithMatch(
        paginatedListStub,
        "/buckets",
        { since: "42" },
        { headers: {}, retry: 0 }
      );
    });

    it("should support passing custom headers", () => {
      api["_headers"] = { Foo: "Bar" };
      api.listBuckets({ headers: { Baz: "Qux" } });

      sinon.assert.calledWithMatch(
        paginatedListStub,
        "/buckets",
        {},
        { headers: { Foo: "Bar", Baz: "Qux" } }
      );
    });

    it("should resolve with a result object", () => {
      return api
        .listBuckets()
        .should.eventually.have.property("data")
        .eql(data.data);
    });

    it("should support filters and fields", () => {
      api.listBuckets({ filters: { a: "b" }, fields: ["c", "d"] });

      sinon.assert.calledWithMatch(paginatedListStub, "/buckets", {
        filters: { a: "b" },
        fields: ["c", "d"],
      });
    });
  });

  /** @test {KintoClient#createBucket} */
  describe("#createBucket", () => {
    let createRequestStub: Stub<typeof requests.createRequest>;

    beforeEach(() => {
      createRequestStub = sandbox.stub(requests, "createRequest");
      sandbox.stub(api, "execute").returns(Promise.resolve());
    });

    it("should execute expected request", () => {
      api.createBucket("foo");

      sinon.assert.calledWithMatch(
        createRequestStub,
        "/buckets/foo",
        { data: { id: "foo" }, permissions: undefined },
        { headers: {}, safe: false }
      );
    });

    it("should accept a data option", () => {
      api.createBucket("foo", { data: { a: 1 } });

      sinon.assert.calledWithMatch(
        createRequestStub,
        "/buckets/foo",
        { data: { id: "foo", a: 1 }, permissions: undefined },
        { headers: {}, safe: false }
      );
    });

    it("should accept a safe option", () => {
      api.createBucket("foo", { safe: true });

      sinon.assert.calledWithMatch(
        createRequestStub,
        "/buckets/foo",
        { data: { id: "foo" }, permissions: undefined },
        { headers: {}, safe: true }
      );
    });

    it("should extend request headers with optional ones", () => {
      api["_headers"] = { Foo: "Bar" };

      api.createBucket("foo", { headers: { Baz: "Qux" } });

      sinon.assert.calledWithMatch(
        createRequestStub,
        "/buckets/foo",
        { data: { id: "foo" }, permissions: undefined },
        { headers: { Foo: "Bar", Baz: "Qux" }, safe: false }
      );
    });
  });

  /** @test {KintoClient#deleteBucket} */
  describe("#deleteBucket()", () => {
    let deleteRequestStub: Stub<typeof requests.deleteRequest>;

    beforeEach(() => {
      deleteRequestStub = sandbox.stub(requests, "deleteRequest");
      sandbox.stub(api, "execute").returns(Promise.resolve());
    });

    it("should execute expected request", () => {
      api.deleteBucket("plop");

      sinon.assert.calledWithMatch(deleteRequestStub, "/buckets/plop", {
        headers: {},
        safe: false,
      });
    });

    it("should accept a bucket object", () => {
      api.deleteBucket({ id: "plop" });

      sinon.assert.calledWithMatch(deleteRequestStub, "/buckets/plop", {
        headers: {},
        safe: false,
      });
    });

    it("should accept a safe option", () => {
      api.deleteBucket("plop", { safe: true });

      sinon.assert.calledWithMatch(deleteRequestStub, "/buckets/plop", {
        safe: true,
      });
    });

    it("should extend request headers with optional ones", () => {
      api["_headers"] = { Foo: "Bar" };

      api.deleteBucket("plop", { headers: { Baz: "Qux" } });

      sinon.assert.calledWithMatch(deleteRequestStub, "/buckets/plop", {
        headers: { Foo: "Bar", Baz: "Qux" },
      });
    });
  });

  /** @test {KintoClient#deleteBuckets} */
  describe("#deleteBuckets()", () => {
    let deleteRequestStub: Stub<typeof requests.deleteRequest>;

    beforeEach(() => {
      api.serverInfo = {
        project_name: "",
        project_version: "",
        http_api_version: "1.4",
        project_docs: "",
        url: "",
        settings: { readonly: false, batch_max_requests: 25 },
        capabilities: {},
      };
      deleteRequestStub = sandbox.stub(requests, "deleteRequest");
      sandbox.stub(api, "execute").returns(Promise.resolve({}));
    });

    it("should execute expected request", () => {
      return api.deleteBuckets().then(_ => {
        sinon.assert.calledWithMatch(deleteRequestStub, "/buckets", {
          headers: {},
          safe: false,
        });
      });
    });

    it("should accept a safe option", () => {
      return api.deleteBuckets({ safe: true }).then(_ => {
        sinon.assert.calledWithMatch(deleteRequestStub, "/buckets", {
          safe: true,
        });
      });
    });

    it("should extend request headers with optional ones", () => {
      api["_headers"] = { Foo: "Bar" };

      return api.deleteBuckets({ headers: { Baz: "Qux" } }).then(_ => {
        sinon.assert.calledWithMatch(deleteRequestStub, "/buckets", {
          headers: { Foo: "Bar", Baz: "Qux" },
        });
      });
    });

    it("should reject if http_api_version mismatches", () => {
      api.serverInfo = {
        project_name: "",
        project_version: "",
        http_api_version: "1.3",
        project_docs: "",
        url: "",
        settings: { readonly: false, batch_max_requests: 25 },
        capabilities: {},
      };

      return api.deleteBuckets().should.be.rejectedWith(Error, /Version/);
    });
  });
});
