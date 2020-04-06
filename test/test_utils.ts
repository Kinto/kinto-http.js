import sinon from "sinon";

const { expect } = intern.getPlugin("chai");

export function fakeServerResponse(
  status: number,
  json: any,
  headers: { [key: string]: string | number } = {}
) {
  return Promise.resolve({
    status: status,
    headers: {
      get(name: string) {
        if (!("Content-Length" in headers) && name === "Content-Length") {
          return JSON.stringify(json).length;
        }
        return headers[name];
      },
    },
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
  if (globalThis.btoa) {
    return globalThis.btoa(str);
  }

  return Buffer.from(str, "binary").toString("base64");
}
