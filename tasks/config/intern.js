let path = require('path');
let {resolve} = require('path'); // kibi: added to be able to load uiConfig
let root = p => resolve(__dirname, '../../', p);  // kibi: added to be able to load uiConfig

module.exports = function (grunt) {
  let uiConfig = require(root('test/serverConfig'));

  return {
    options: {
      runType: 'runner',
      config: 'test/intern',
      reporters: ['Console'],
      proxyPort: uiConfig.servers.webdriver.proxyPort,
      proxyUrl: uiConfig.servers.webdriver.protocol + '://' +
                uiConfig.servers.webdriver.hostname + ':' +
                uiConfig.servers.webdriver.proxyPort + '/'
    },
    dev: {}
  };
};
