// craco.config.js
const CracoEsbuildPlugin = require('craco-esbuild');
const path = require('path');
const { DefinePlugin } = require('webpack');

const resolvePackage = (relativePath) => {
  return path.resolve(__dirname, relativePath);
};

module.exports = {
  webpack: {
    plugins: [
      new DefinePlugin({
        // Use build timestamp as version id
        'process.env.WASM_VERSION': DefinePlugin.runtimeValue(Date.now, true),
      }),
    ],
    configure: (webpackConfig, { env, paths }) => {
      return webpackConfig;
    },
    headers: {
      'Content-Security-Policy': "frame-ancestors 'self'",
    },
  },
  plugins: [
    {
      plugin: CracoEsbuildPlugin,
      options: {
        includePaths: [
          resolvePackage('../playground-ui'),
          resolvePackage('../spicedb-common'),
        ], // Optional. If you want to include components which are not in src folder
        enableSvgr: true, // Optional.
        svgrOptions: {
          removeViewBox: false,
        },
      },
    },
  ],
  eslint: {
    enable: false,
  },
};
