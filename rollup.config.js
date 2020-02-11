import builtins from "rollup-plugin-node-builtins";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";

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

export default [geckoBuild, browserBuild];
