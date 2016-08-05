module.exports = {
  options: {
    timeout: 60000, // kibi: increased default timeout for jenkins build
    slow: 5000,
    ignoreLeaks: false,
    reporter: 'list'
  },
  all: {
    src: [
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!src/**/public/**',
      '!src/ui/**'
    ]
  }
};
