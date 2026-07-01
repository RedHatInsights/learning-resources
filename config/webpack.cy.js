const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { ModuleFederationPlugin } = require('webpack').container;

/** @type { import("webpack").Configuration } */
const config = {
  module: {
    rules: [
      {
        test: /\.(js|ts)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
            },
          },
        },
      },
      {
        test: /\.s?[ac]ss$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
      {
        test: /\.(jpe?g|svg|png|gif|ico|eot|ttf|woff2?)(\?v=\d+\.\d+\.\d+)?$/i,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      'chrome/search/useOramaSearch': path.resolve(__dirname, '../src/__mocks__/chrome/search/useOramaSearch.ts'),
    },
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new ModuleFederationPlugin({
      name: 'chrome',
      filename: 'chrome.js',
      shared: [
        { react: { singleton: true, eager: true } },
        { 'react-dom': { singleton: true, eager: true } },
        { 'react-router-dom': { singleton: true } },
        { '@openshift/dynamic-plugin-sdk': { singleton: true } },
        { '@patternfly/react-core': {} },
        { '@patternfly/quickstarts': { singleton: true } },
        { '@scalprum/core': { singleton: true } },
        { '@scalprum/react-core': { singleton: true } },
        { '@unleash/proxy-client-react': { singleton: true } },
      ],
    }),
  ]
}

module.exports = config;
