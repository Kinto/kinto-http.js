import path from "path";
import builtins from "rollup-plugin-node-builtins";
import nodePolyfills from "rollup-plugin-node-polyfills";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import inject from "@rollup/plugin-inject";
import { terser } from "rollup-plugin-terser";
import multi from "@rollup/plugin-multi-entry";
import replace from "@rollup/plugin-replace";

const geckoBuild = {
  input: "./src/index.fx.ts",
  output: [
    {
      file: "dist/temp.js",
      format: "umd",
      name: "KintoHttpClient",
    },
  ],
  plugins: [
    resolve({
      mainFields: ["module", "main", "browser"],
      preferBuiltins: true,
    }),
    typescript({
      include: ["*.ts+(|x)", "**/*.ts+(|x)", "*.js", "**/*.js"],
    }),
    commonjs({ ignoreGlobal: true }),
  ],
};

const browserBuild = {
  input: "./src/index.browser.ts",
  output: [
    {
      file: "dist/kinto-http.min.js",
      format: "umd",
      name: "KintoClient",
      sourcemap: true,
    },
  ],
  plugins: [
    resolve({
      mainFields: ["module", "main", "browser"],
      preferBuiltins: true,
    }),
    typescript({
      include: ["*.ts+(|x)", "**/*.ts+(|x)", "*.js", "**/*.js"],
      target: "es5",
    }),
    builtins(),
    commonjs(),
    terser(),
  ],
};

const nodeBuild = {
  input: "./src/index.ts",
  output: [
    {
      file: "dist/kinto-http.node.js",
      format: "cjs",
      sourcemap: true,
    },
  ],
  external: ["uuid", "node-fetch", "form-data", "atob"],
  plugins: [
    typescript({
      include: ["*.ts+(|x)", "**/*.ts+(|x)", "*.js", "**/*.js"],
      target: "es2018",
    }),
    inject({
      fetch: "node-fetch",
      Headers: ["node-fetch", "Headers"],
      FormData: "form-data",
      atob: "atob",
      Blob: path.resolve("./blob.js"),
    }),
    commonjs(),
  ],
};

const browserTestBuild = {
  input: "./test/*_test.ts",
  output: [
    {
      file: "dist/test-suite.js",
      format: "iife",
      sourcemap: true,
      globals: {
        intern: "intern",
      },
    },
  ],
  plugins: [
    multi(),
    commonjs({ extensions: [".js", ".ts"] }),
    nodePolyfills(),
    resolve({
      mainFields: ["browser", "module", "main"],
      preferBuiltins: true,
    }),
    typescript({
      tsconfig: "./test/tsconfig.json",
    }),
    replace({
      preventAssignment: true,
      __dirname: JSON.stringify(path.join(__dirname, "test")),
      "process.env.TEST_KINTO_SERVER": JSON.stringify(
        process.env.TEST_KINTO_SERVER ? process.env.TEST_KINTO_SERVER : ""
      ),
      "process.env.SERVER": JSON.stringify(
        process.env.SERVER ? process.env.SERVER : ""
      ),
      "process.env.KINTO_PROXY_SERVER": JSON.stringify(
        process.env.SERVER ? process.env.SERVER : "http://localhost:8899"
      ),
      "http://0.0.0.0": "http://localhost",
    }),
  ],
};

const bundles = process.env.BROWSER_TESTING
  ? [browserTestBuild]
  : [geckoBuild, browserBuild, nodeBuild];

export default bundles;
