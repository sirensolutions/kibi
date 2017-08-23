module.exports = function () {
  return {
    devSource: {
      options: { mode: true },
      src: [
        'src/**',
        '!src/**/__tests__/**',
        '!src/test_utils/**',
        '!src/fixtures/**',
        '!src/core_plugins/dev_mode/**',
        '!src/core_plugins/tests_bundle/**',
        '!src/core_plugins/console/public/tests/**',
        '!src/cli/cluster/**',
        '!src/ui_framework/doc_site/**',
        '!src/es_archiver/**',
        '!src/functional_test_runner/**',
        'bin/**',
        'ui_framework/components/**',
        'ui_framework/services/**',
        'ui_framework/dist/**',
        'webpackShims/**',
        'config/kibi.yml', // kibi: renamed kibana to kibi
      ],
      dest: 'build/kibana',
      expand: true
    },
  };
};
