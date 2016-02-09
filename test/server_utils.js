import { spawn } from "child_process";


const DEFAULT_OPTIONS = {
  maxAttempts: 50,
  kintoConfigPath: __dirname + "/kinto.ini",
  pservePath: process.env.KINTO_PSERVE_EXECUTABLE || "pserve",
};

export default class KintoServer {
  constructor(url, options = {}) {
    this.url = url;
    this.process = null;
    this.logs = [];
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
  }

  start(env) {
    if (this.process) {
      throw new Error("Server is already started.");
    }
    return new Promise(resolve => {
      // Add the provided environment variables to the child process environment.
      // Keeping parent's environment is needed so that pserve's executable
      // can be found (with PATH) if KINTO_PSERVE_EXECUTABLE env variable was
      // not provided.
      env = Object.assign({}, process.env, env);
      this.process = spawn(
        this.options.pservePath,
        [this.options.kintoConfigPath],
        {env, detached: true}
      );
      this.process.stderr.on("data", data => {
        this.logs.push(data);
      });
      this.process.on("close", code => {
        if (code && code > 0) {
          throw new Error("Server errors encountered:\n" +
            this.logs.map(line => line.toString()).join(""));
        }
      });
      // Allow some time for the server to start.
      setTimeout(resolve, 1000);
    });
  }

  stop() {
    this.process.kill();
    this.process = null;
    return new Promise(resolve => {
      setTimeout(() => resolve(), 500);
    });
  }

  flush(attempt = 1) {
    return fetch(`${this.url}/__flush__`, {method: "POST"})
      .then(res => {
        if ([202, 410].indexOf(res.status) === -1) {
          throw new Error("Unable to flush test server.");
        }
      })
      .catch(err => {
        // Prevent race condition where integration tests start while server
        // isn't running yet.
        if (/ECONNREFUSED/.test(err.message) &&
            attempt < this.options.maxAttempts) {
          return new Promise(resolve => {
            setTimeout(_ => resolve(this.flush(attempt++)), 250);
          });
        }
        throw err;
      });
  }

  killAll() {
    return new Promise((resolve) => {
      spawn("killall", ["pserve"]).on("close", () => resolve());
    });
  }
}

