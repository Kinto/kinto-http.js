import builtins from "rollup-plugin-node-builtins";
import typescript from "rollup-plugin-typescript";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import inject from "rollup-plugin-inject";
import path from "path";

const geckoBuild = {
  input: "./src/index.fx.js",
  output: [
    {
      file: "dist/temp.js",
      format: "umd",
      name: "KintoHttpClient",
    },
  ],
  plugins: [
    inject({
      setTimeout: [path.resolve("fx-src/timer.js"), "setTimeout"],
      clearTimeout: [path.resolve("fx-src/timer.js"), "clearTimeout"],
    }),
    resolve({
      mainFields: ["module", "main", "browser"],
      preferBuiltins: true,
    }),
    typescript({ include: ["*.ts+(|x)", "**/*.ts+(|x)", "*.js", "**/*.js"] }),
    commonjs({ ignoreGlobal: true }),
  ],
};

const browserBuild = {
  input: "./src/index.js",
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
      target: "es5",
      include: ["*.ts+(|x)", "**/*.ts+(|x)", "*.js", "**/*.js"],
    }),
    builtins(),
    commonjs(),
    terser(),
  ],
};

export default [geckoBuild, browserBuild];
