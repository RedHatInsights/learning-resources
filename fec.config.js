const path = require('path');

module.exports = {
  appUrl: [
    '/settings/learning-resources',
    '/openshift/learning-resources',
    '/ansible/learning-resources',
    '/insights/learning-resources',
    '/edge/learning-resources',
    '/iam/learning-resources',
    '/learning-resources',
    '/learning-resources/creator',
  ],
  debug: true,
  useProxy: true,
  proxyVerbose: true,
  sassPrefix: '.learning-resources, .learningResources',
  /**
   * Change to false after your app is registered in configuration files
   */
  interceptChromeConfig: false,
  hotReload: true,
  __unstableHotReload: true,
  /**
   * Add additional webpack plugins
   */
  frontendCRDPath: path.resolve(__dirname, './deploy/frontend.yml'),
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
      './HelpPanel': path.resolve(__dirname, './src/components/HelpPanel/index.ts'),
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