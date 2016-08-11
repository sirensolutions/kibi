let path = require('path');
let {resolve} = require('path'); // kibi: added by kibi
let root = p => resolve(__dirname, '../../', p);  // kibi: added by kibi

module.exports = function (grunt) {
  let uiConfig = require(root('test/serverConfig'));

  return {
    options: {
      runType: 'runner',
      config: 'test/intern',
      reporters: ['Console'],
      proxyPort: uiConfig.servers.webdriver.proxyPort,
      proxyUrl: 'http://localhost:' + uiConfig.servers.webdriver.proxyPort + '/'
    },
    dev: {}
  };
};
