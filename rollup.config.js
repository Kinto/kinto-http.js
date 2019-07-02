import builtins from "rollup-plugin-node-builtins";
import typescript from "rollup-plugin-typescript";
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import { terser } from "rollup-plugin-terser";

function replaceGlobals() {
  return {
    name: "replaceGlobals",
    renderChunk(code, chunk, options) {
      const searchString =
        "setTimeout: setTimeout$1, clearTimeout: clearTimeout$1";
      const replacementString = "setTimeout, clearTimeout";

      if (code.includes(searchString)) {
        code = code.replace(searchString, replacementString);
      }

      return { code };
    },
  };
}

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
    resolve({
      mainFields: ["module", "main", "browser"],
      preferBuiltins: true,
    }),
    typescript({ include: ["*.ts+(|x)", "**/*.ts+(|x)", "*.js", "**/*.js"] }),
    commonjs({ ignoreGlobal: true }),
    replaceGlobals(),
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
