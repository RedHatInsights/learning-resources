import { defineConfig } from "cypress";


export default defineConfig({
  component: {
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
    devServer: {
      framework: "react",
      bundler: "webpack",
      webpackConfig: require( './config/webpack.cy.js'),
    },
  },
});
