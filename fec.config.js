const path = require('path');

module.exports = {
  appUrl: ['/settings/learning-resources', '/openshift/learning-resources', "/staging/global-learning-resources-page"],
  debug: true,
  useProxy: true,
  proxyVerbose: true,
  sassPrefix: '.learning-resources, .learningResources',
  /**
   * Change to false after your app is registered in configuration files
   */
  interceptChromeConfig: false,
  hotReload: true,
  /**
   * Add additional webpack plugins
   */
  plugins: [],
  moduleFederation: {
    exposes: {
      './RootApp': path.resolve(__dirname, './src/AppEntry.tsx'),
      './BookmarkedLearningResourcesWidget': path.resolve(
        __dirname,
        './src/components/LearningResourcesWidget/LearningResourcesWidget'
      ),
      './GlobalLearningResourcesPage': path.resolve(
        __dirname,
        './src/components/GlobalLearningResourcesPage/GlobalLearningResourcesPage'
      ),
      './Creator': path.resolve(__dirname, './src/Creator.tsx'),
    },
    exclude: ['react-router-dom'],
    shared: [
      {
        'react-router-dom': {
          singleton: true,
          version: '*',
        },
      },
    ],
  },
};