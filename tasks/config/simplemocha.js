import { createAutoJunitReporter } from '../../src/dev';

export default {
  options: {
    timeout: 60000, // kibi: increased default timeout for jenkins build
    grep: grunt.option('grep'), // kibi: support grep for mocha tests
    slow: 5000,
    ignoreLeaks: false,
    reporter: 'spec',
    reporter: createAutoJunitReporter({
      reportName: 'Server Mocha Tests'
    }),
    globals: ['nil'],
  },
  all: {
    src: [
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'plugins/**/lib/**/__tests__/**/*.js', // kibi: Support execution of mocha tests in plugins
      'tasks/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!src/**/public/**',
      '!**/_*.js',
      '!plugins/**/public/**', // kibi: Support execution of mocha tests in plugins
      '!plugins/**/node_modules/**', // kibi: Support execution of mocha tests in plugins

      // NOTE: there should be a convention where to put tests which require start of es cluster
      '!**/migrations/__tests__/functional/**/*.js',
      '!**/acl/__tests__/functional/**/*.js',
      '!**/saved_objects_api/__tests__/functional/**/*.js',
      '!**/saved_objects_api/lib/model/__tests__/functional/**/*js'
    ]
  },
  migrations: {
    src: [
      // NOTE: there should be a convention where to put tests which require start of es cluster
      '**/migrations/__tests__/functional/**/*.js',
      '**/acl/__tests__/functional/**/*.js',
      '**/saved_objects_api/__tests__/functional/**/*.js',
      '**/saved_objects_api/lib/model/__tests__/functional/**/*js'
    ]
  }
};
