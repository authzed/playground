// craco.config.js
const CracoEsbuildPlugin = require('craco-esbuild');

const HEADER_CONTENT_SECURITY_POLICY =
  process.env.HEADER_CONTENT_SECURITY_POLICY || '';

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
