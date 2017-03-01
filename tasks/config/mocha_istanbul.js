module.exports = (grunt) => ({
  options: {
    timeout: 60000,
    slow: 5000,
    grep: grunt.option('grep'),
    mochaOptions: [
      '--compilers',
      'js:babel-core/register',
      '--check-leaks'
    ],
    istanbulOptions: [
      '--harmony',
      '--handle-sigint'
    ],
    coverageFolder: 'coverage/server',
    reportFormats: [
      'cobertura',
      'lcov',
      'text-summary'
    ]
  },
  all: {
    src: [
      'test/**/__tests__/**/*.js',
      'src/**/__tests__/**/*.js',
      'plugins/**/lib/**/__tests__/**/*.js',
      'test/fixtures/__tests__/*.js',
      '!src/**/public/**',
      '!src/ui/**',
      '!plugins/**/public/**',
      '!plugins/**/node_modules/**',
    ]
  }
});
