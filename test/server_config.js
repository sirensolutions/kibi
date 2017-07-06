const shield = require('./shield');
const kibanaURL = '/app/kibana';

module.exports = {
  servers: {
    webdriver: {
      protocol: process.env.TEST_WEBDRIVER_PROTOCOL || 'http',
      hostname: process.env.TEST_WEBDRIVER_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_WEBDRIVER_PORT, 10) || 4444
    },
    kibana: {
      protocol: process.env.TEST_KIBANA_PROTOCOL || 'http',
      hostname: process.env.TEST_KIBANA_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_KIBANA_PORT, 10) || 5620,
      auth: shield.kibanaUser.username + ':' + shield.kibanaUser.password,
      username: shield.kibanaUser.username,
      password: shield.kibanaUser.password,
      index: '.kibana' // kibi: set default index to .kibana to reuse upstream fixtures
    },
    elasticsearch: {
      protocol: process.env.TEST_ES_PROTOCOL || 'http',
      hostname: process.env.TEST_ES_HOSTNAME || 'localhost',
      port: parseInt(process.env.TEST_ES_PORT, 10) || 9220,
      auth: shield.admin.username + ':' + shield.admin.password,
      username: shield.admin.username,
      password: shield.admin.password
    },
    // kibi: by making testserver and karma ports
    // custom so we can run 2 test:browser processes on the same box
    // important for running PRs on Jenkins
    testserver: {
      port: parseInt(process.env.TEST_TESTSERVER_PORT, 10) || 5610
    },
    karma: {
      port: parseInt(process.env.TEST_KARMA_PORT, 10) || 9876
    }
    // kibi: end
  },
  apps: {
    status_page: {
      pathname: '/status'
    },
    discover: {
      pathname: kibanaURL,
      hash: '/discover',
    },
    context: {
      pathname: kibanaURL,
      hash: '/context',
    },
    visualize: {
      pathname: kibanaURL,
      hash: '/visualize',
    },
    dashboard: {
      pathname: kibanaURL,
      hash: '/dashboards',
    },
    dashboardlist: {
      pathname: kibanaURL,
      hash: '/dashboards-listing',
    },
    settings: {
      pathname: kibanaURL,
      hash: '/management'
    },
    console: {
      pathname: kibanaURL,
      hash: '/dev_tools/console',
    }
  }
};
