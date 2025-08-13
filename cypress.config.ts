import { defineConfig } from "cypress";
import externalWebpackConfig from './config/webpack.cy.js';

export default defineConfig({
  component: {
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: "react",
      bundler: "webpack",
      webpackConfig: externalWebpackConfig,
    },
  },
});
