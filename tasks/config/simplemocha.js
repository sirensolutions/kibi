module.exports = grunt => ({
  options: {
    timeout: 60000, // kibi: increased default timeout for jenkins build
    slow: 5000,
    ignoreLeaks: false,
    reporter: 'spec',
    grep: grunt.option('grep'), // kibi: support grep for mocha tests
    globals: ['nil']
  },
  all: {
    src: [
      'test/mocha_setup.js',
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
      '!**/saved_objects_api/__tests__/functional/**/*.js'
    ]
  },
  migrations: {
    src: [
      // NOTE: there should be a convention where to put tests which require start of es cluster
      '**/migrations/__tests__/functional/**/*.js',
      '**/acl/__tests__/functional/**/*.js',
      '**/saved_objects_api/__tests__/functional/**/*.js'
    ]
  }
});
