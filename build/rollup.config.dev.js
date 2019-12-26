const serve = require("rollup-plugin-serve");
const { config, resolve } = require("./rollup.config.base");

const PORT = 3000;

config.output.sourcemap = true;
config.plugins = [
  ...config.plugins,
  ...[
    serve({
      port: PORT,
      contentBase: [resolve("example"), resolve("dist")]
    })
  ]
];

module.exports = config;
