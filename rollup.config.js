import babel from "rollup-plugin-babel";
import builtins from "rollup-plugin-node-builtins";
import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import uglify from "rollup-plugin-uglify";
import path from "path";

const plugins = [
  babel({
    exclude: "node_modules/**",
    runtimeHelpers: true
  })
];

if (process.env.BABEL_ENV !== "no-shim") {
  plugins.push(
    nodeResolve({
      jsnext: true,
      browser: true
    }),
    commonjs(),
    builtins()
  );
}

if (process.env.BABEL_ENV === "production") {
  plugins.push(uglify());
}

export default {
  entry: "src/index.js",
  format: "umd",
  moduleName: "KintoClient",
  sourceMap: true,
  dest: path.join(__dirname, "dist", "kinto-http.js"),
  plugins
};
