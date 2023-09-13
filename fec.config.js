module.exports = {
  appUrl: ['/settings/learning-resources'],
  debug: true,
  useProxy: true,
  proxyVerbose: true,
  sassPrefix: '.learning-resources, .learningResources',
  /**
   * Change to false after your app is registered in configuration files
   */
  interceptChromeConfig: false,
  _unstableHotReload: process.env.HOT === 'true',
  /**
   * Add additional webpack plugins
   */
  plugins: [],
};
