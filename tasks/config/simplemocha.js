module.exports = (grunt) => ({
  options: {
    timeout: 60000, // kibi: increased default timeout for jenkins build
    slow: 5000,
    ignoreLeaks: false,
    reporter: 'list',
    grep: grunt.option('grep')
  },
  all: {
    src: [
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'installedPlugins/**/lib/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!src/**/public/**',
      '!**/_*.js',
      '!src/ui/**',
      '!installedPlugins/**/public/**',
      '!installedPlugins/**/node_modules/**',
    ]
  }
});
