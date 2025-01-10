// craco.config.js
const CracoEsbuildPlugin = require('craco-esbuild');
const path = require('path');

const HEADER_CONTENT_SECURITY_POLICY =
  process.env.HEADER_CONTENT_SECURITY_POLICY || '';

const resolvePackage = (relativePath) => {
  return path.resolve(__dirname, relativePath);
};

module.exports = {
  webpack: {
    plugins: [],
    configure: (webpackConfig, { env, paths }) => {
      webpackConfig.module.rules.push({
          test: /\.mjs$/,
          include: /node_modules/,
          type: 'javascript/auto',
        });
      return webpackConfig;
    },
    headers: {
      'Content-Security-Policy': `frame-ancestors 'self' ${HEADER_CONTENT_SECURITY_POLICY}`,
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
