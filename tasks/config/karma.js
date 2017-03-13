module.exports = function (grunt) {

  const {resolve} = require('path');
  const root = p => resolve(__dirname, '../../', p);
  const uiConfig = require(root('test/serverConfig'));

  return {
    options: {
      // base path that will be used to resolve all patterns (eg. files, exclude)
      basePath: '',

      captureTimeout: 30000,
      browserNoActivityTimeout: 120000,
      frameworks: ['mocha'],
      port: uiConfig.servers.karma.port,
      colors: true,
      logLevel: grunt.option('debug') || grunt.option('verbose') ? 'DEBUG' : 'INFO',
      autoWatch: false,
      browsers: ['<%= karmaBrowser %>'],

      // available reporters: https://npmjs.org/browse/keyword/karma-reporter
      reporters: process.env.CI ? ['dots'] : ['progress'],

      // kibi: use uiConfig.servers.testserver.port to pass the port
      // important for running PRs on Jenkins
      // list of files / patterns to load in the browser
      files: [
        'http://localhost:' + uiConfig.servers.testserver.port + '/bundles/commons.bundle.js',
        'http://localhost:' + uiConfig.servers.testserver.port + '/bundles/tests.bundle.js',
        'http://localhost:' + uiConfig.servers.testserver.port + '/bundles/commons.style.css',
        'http://localhost:' + uiConfig.servers.testserver.port + '/bundles/tests.style.css'
      ],

      proxies: {
        '/tests/': 'http://localhost:' + uiConfig.servers.testserver.port + '/tests/',
        '/bundles/': 'http://localhost:' + uiConfig.servers.testserver.port + '/bundles/'
      },

      client: {
        mocha: {
          reporter: 'html', // change Karma's debug.html to the mocha web reporter
          timeout: 10000,
          slow: 5000
        }
      }
    },

    dev: { singleRun: false },
    unit: { singleRun: true },
    coverage: {
      singleRun: true,
      reporters: [
        'coverage',
        'progress'
      ],
      coverageReporter: {
        dir: 'coverage/browser',
        reporters: [
          {
            type: 'html',
            subdir: 'html'
          },
          {
            type: 'cobertura',
            subdir: './',
            file: 'cobertura.xml'
          },
          {
            type: 'json',
            subdir: './',
            file: 'coverage.json'
          },
          {
            type: 'text-summary'
          }
        ]
      }
    }
  };
};
