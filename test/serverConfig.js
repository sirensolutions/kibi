var shield = require('./shield');

var kibanaURL = '/app/kibana';

module.exports = {
  servers: {
    webdriver: {
      protocol: process.env.TEST_UI_WEBDRIVER_PROTOCOL || 'http',
      hostname: process.env.TEST_UI_WEBDRIVER_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_UI_WEBDRIVER_PORT, 10) || 4444,
      // kibi: by passing TEST_UI_PROXY_PORT we can run 2 test:ui processes on the same box
      // important for running PRs on Jenkins
      proxyPort: parseInt(process.env.TEST_UI_PROXY_PORT, 10) || 9000
    },
    kibana: {
      protocol: process.env.TEST_UI_KIBANA_PROTOCOL || 'http',
      hostname: process.env.TEST_UI_KIBANA_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_UI_KIBANA_PORT, 10) || 5620,
      auth: shield.kibanaUser.username + ':' + shield.kibanaUser.password
    },
    elasticsearch: {
      protocol: process.env.TEST_UI_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_UI_ES_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_UI_ES_PORT, 10) || 9220,
      auth: shield.admin.username + ':' + shield.admin.password
    },
    // kibi: by making testserver and karma ports
    // custom so we can run 2 test:browser processes on the same box
    // important for running PRs on Jenkins
    testserver: {
      port: parseInt(process.env.TEST_UI_TESTSERVER_PORT, 10) || 5610
    },
    karma: {
      port: parseInt(process.env.TEST_UI_KARMA_PORT, 10) || 9876
    }
  },
  apps: {
    statusPage: {
      pathname: 'status'
    },
    discover: {
      pathname: kibanaURL,
      hash: '/discover',
    },
    visualize: {
      pathname: kibanaURL,
      hash: '/visualize',
    },
    dashboard: {
      pathname: kibanaURL,
      hash: '/dashboard',
    },
    settings: {
      pathname: kibanaURL,
      hash: '/settings'
    }
  }
};
