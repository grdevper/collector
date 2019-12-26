const { terser } = require("rollup-plugin-terser");
const { config, resolve } = require("./rollup.config.base");
const pkg = require("../package.json");

const DATE = new Date().toLocaleDateString();
config.output.sourcemap = false;
config.output.file = resolve("dist/tog-collector.min.js");
config.plugins = [
  ...config.plugins,
  terser({
    compress: {
      // remove console.log
      pure_funcs: ["console.log"]
    },
    output: {
      // add comment on the top
      preamble: `/*! ${pkg.name} - v${pkg.version} - ${DATE} */`
    }
  })
];

module.exports = config;
