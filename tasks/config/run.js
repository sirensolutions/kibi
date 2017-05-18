module.exports = function (grunt) {
  const platform = require('os').platform();
  const { format } = require('url');
  const { resolve } = require('path');
  const root = p => resolve(__dirname, '../../', p);

  // kibi: replaced scrpit name with kibi
  const binScript =  /^win/.test(platform) ? '.\\bin\\kibi.bat' : './bin/kibi';
  const buildScript =  /^win/.test(platform) ? '.\\build\\kibana\\bin\\kibi.bat' : './build/kibana/bin/kibi';
  // kibi: end

  const uiConfig = require(root('test/server_config'));
  const chromedriver = require('chromedriver');

  const stdDevArgs = [
    '--env.name=development',
    '--logging.json=false',
  ];

  const buildTestsArgs = [
    ...stdDevArgs,
    '--plugins.initialize=false',
    '--optimize.bundleFilter=tests',
  ];

  const kbnServerFlags = grunt.option.flags().reduce(function (flags, flag) {
    if (flag.startsWith('--kbnServer.')) {
      flags.push(`--${flag.slice(12)}`);
    }

    return flags;
  }, []);

  return {
    testServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...buildTestsArgs,
        `--server.port=${uiConfig.servers.testserver.port}`, // kibi: make the port configurable
        ...kbnServerFlags,
      ]
    },

    apiTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--optimize.enabled=false',
        '--elasticsearch.url=' + format(uiConfig.servers.elasticsearch),
        '--server.port=' + uiConfig.servers.kibana.port,
        '--server.xsrf.disableProtection=true',
        ...kbnServerFlags,
      ]
    },

    testUIServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--server.port=' + uiConfig.servers.kibana.port,
        // kibi: use index from config
        '--kibana.index=' + uiConfig.servers.kibana.index,
        '--elasticsearch.url=' + format(uiConfig.servers.elasticsearch),
        ...kbnServerFlags,
      ]
    },

    testUIDevServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...stdDevArgs,
        '--server.port=' + uiConfig.servers.kibana.port,
        // kibi: use index from config
        '--kibana.index=' + uiConfig.servers.kibana.index,
        '--elasticsearch.url=' + format(uiConfig.servers.elasticsearch),
        '--dev',
        '--no-base-path',
        '--no-ssl',
        '--optimize.lazyPort=5611',
        '--optimize.lazyPrebuild=true',
        '--optimize.bundleDir=optimize/testUiServer',
        ...kbnServerFlags,
      ]
    },

    testCoverageServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...buildTestsArgs,
        '--server.port=5610',
        '--tests_bundle.instrument=true',
        ...kbnServerFlags,
      ]
    },

    devTestServer: {
      options: {
        wait: false,
        ready: /Server running/,
        quiet: false,
        failOnError: false
      },
      cmd: binScript,
      args: [
        ...buildTestsArgs,
        '--dev',
        '--no-watch',
        '--no-ssl',
        '--no-base-path',
        '--server.port=5610',
        '--optimize.lazyPort=5611',
        '--optimize.lazyPrebuild=true',
        '--optimize.bundleDir=optimize/testdev',
        ...kbnServerFlags,
      ]
    },

    chromeDriver: {
      options: {
        wait: false,
        ready: /Starting ChromeDriver/,
        quiet: false,
        failOnError: false
      },
      cmd: chromedriver.path,
      args: [
        `--port=${uiConfig.servers.webdriver.port}`,
        '--url-base=wd/hub',
      ]
    },

    devChromeDriver: {
      options: {
        wait: false,
        ready: /Starting ChromeDriver/,
        quiet: false,
        failOnError: false
      },
      cmd: chromedriver.path,
      args: [
        `--port=${uiConfig.servers.webdriver.port}`,
        '--url-base=wd/hub',
      ]
    },

    optimizeBuild: {
      options: {
        wait: false,
        ready: /Optimization .+ complete/,
        quiet: true
      },
      cmd: buildScript,
      args: [
        '--env.name=production',
        '--logging.json=false',
        '--plugins.initialize=false',
        '--server.autoListen=false',
        ...kbnServerFlags,
      ]
    }
  };

};
