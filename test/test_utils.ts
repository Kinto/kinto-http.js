import sinon from "sinon";
import { expect } from "chai";

class Headers extends Map {
  append(name: string, value: string) {
    this.set(name, value);
  }
  forEach(
    callbackfn: (value: string, key: string, parent: Headers) => void,
    thisArg?: any
  ) {
    Array.from(thisArg.keys()).forEach((k) => {
      callbackfn(this.get(k), k as string, this);
    });
  }
}

export function fakeHeaders(headers: { [key: string]: string | number } = {}) {
  const h = new Headers();
  Object.entries(headers).forEach(([k, v]) => h.set(k, v));
  return h;
}

export function fakeServerResponse(
  status: number,
  json: any,
  headers: { [key: string]: string | number } = {}
) {
  const respHeaders = fakeHeaders(headers);
  if (!respHeaders.has("Content-Length")) {
    respHeaders.set("Content-Length", JSON.stringify(json).length);
  }
  return Promise.resolve({
    status: status,
    headers: respHeaders,
    text() {
      return Promise.resolve(JSON.stringify(json));
    },
  });
}

export function delayedPromise(ms: number) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export type Stub<T extends (...args: any[]) => any> = sinon.SinonStub<
  Parameters<T>,
  ReturnType<T>
>;

export type Spy<T extends (...args: any[]) => any> = sinon.SinonSpy<
  Parameters<T>,
  ReturnType<T>
>;

export async function expectAsyncError<T>(
  fn: () => Promise<T>,
  message?: string | RegExp,
  baseClass: any = Error
): Promise<Error> {
  let error: Error;

  try {
    await fn();
  } catch (err) {
    error = err;
  }

  expect(error!).not.to.be.undefined;
  expect(error!).to.be.instanceOf(baseClass);
  if (message) {
    if (typeof message === "string") {
      expect(error!).to.have.property("message").equal(message);
    } else {
      expect(error!).to.have.property("message").match(message);
    }
  }

  return error!;
}

export function btoa(str: string): string {
  return Buffer.from(str, "binary").toString("base64");
}
