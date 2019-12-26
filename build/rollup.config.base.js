const path = require("path");
const babel = require("rollup-plugin-babel");
const commonjs = require("rollup-plugin-commonjs");
const nodeResolve = require("rollup-plugin-node-resolve");

const resolve = function(filePath) {
  return path.resolve(__dirname, "..", filePath);
};

const config = {
  input: resolve("src/index.js"),
  output: {
    name: "TogCollector",
    file: resolve("dist/tog-collector.js"),
    format: "umd"
  },
  plugins: [
    nodeResolve(),
    babel({ exclude: "node_modules/**", runtimeHelpers: true }),
    commonjs()
  ]
};

module.exports = {
  config,
  resolve
};
