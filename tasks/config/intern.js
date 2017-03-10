// kibi: import serverConfig to get the proxyPort parameter
import serverConfig from '../../test/server_config';

module.exports = function (grunt) {
  const webdriver = serverConfig.servers.webdriver;

  return {
    options: {
      runType: 'runner',
      config: 'test/intern',
      bail: true,
      reporters: ['Console'],
      functionalSuites: grunt.option('functionalSuites'),
      appSuites: grunt.option('appSuites'),
      proxyPort: webdriver.proxyPort, // kibi: added proxyPort to allow running 2 UI tests on the same box
      proxyUrl: `${webdriver.protocol}://${webdriver.hostname}:${webdriver.proxyPort}/` // kibi: allow to run more than 1 UI test at a time
    },
    dev: {},
    api: {
      options: {
        runType: 'client',
        config: 'test/intern_api'
      }
    },
    visualRegression: {
      options: {
        runType: 'runner',
        config: 'test/intern_visual_regression'
      }
    }
  };
};
