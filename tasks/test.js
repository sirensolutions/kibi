import _, { keys } from 'lodash';

import visualRegression from '../utilities/visual_regression';

module.exports = function (grunt) {
  grunt.registerTask(
    'test:visualRegression:buildGallery',
    'Compare screenshots and generate diff images.',
    function () {
      const done = this.async();
      visualRegression.run(done);
    }
  );

  grunt.registerTask('test:server', [
    'checkPlugins',
    'simplemocha:all',
    // kibi: we are starting the es for migration tests
    'esvm:test',
    'simplemocha:migrations',
    'esvm_shutdown:test'
    // kibi: end
  ]);

  grunt.registerTask('test:browser', [
    'checkPlugins',
    'run:testServer',
    'karma:unit',
  ]);

  grunt.registerTask('test:browser-ci', () => {
    const ciShardTasks = keys(grunt.config.get('karma'))
      .filter(key => key.startsWith('ciShard-'))
      .map(key => `karma:${key}`);

    grunt.log.ok(`Running browser tests in ${ciShardTasks.length} shards`);

    grunt.task.run([
      'run:testServer',
      ...ciShardTasks
    ]);
  });

  grunt.registerTask('test:coverage', [ 'run:testCoverageServer', 'karma:coverage' ]);

  grunt.registerTask('test:quick', [
    'test:server',
    'test:browser-ci',
    'test:api',
    'test:jest',
    //'test:ui'
  ]);

  grunt.registerTask('test:dev', [
    'checkPlugins',
    'run:devTestServer',
    'karma:dev'
  ]);

  grunt.registerTask('test:ui', [
    'checkPlugins',
    'esvm:ui',
    'run:testUIServer',
    'functional_test_runner:functional',
    'esvm_shutdown:ui',
    'stop:testUIServer'
  ]);

  grunt.registerTask('test:uiRelease', [
    'checkPlugins',
    'esvm:ui',
    'run:testUIReleaseServer',
    'functional_test_runner:functional',
    'esvm_shutdown:ui',
    'stop:testUIReleaseServer'
  ]);

  grunt.registerTask('test:ui:server', [
    'checkPlugins',
    'esvm:ui',
    'run:testUIDevServer:keepalive'
  ]);

  grunt.registerTask('test:api', [
    'esvm:ui',
    'run:apiTestServer',
    'functional_test_runner:apiIntegration',
    'esvm_shutdown:ui',
    'stop:apiTestServer'
  ]);

  grunt.registerTask('test:api:server', [
    'esvm:ui',
    'run:devApiTestServer:keepalive'
  ]);

  grunt.registerTask('test:api:runner', () => {
    grunt.fail.fatal('test:api:runner has moved, use: `node scripts/function_test_runner --config test/api_integration/config.js`');
  });

  grunt.registerTask('test', subTask => {
    if (subTask) grunt.fail.fatal(`invalid task "test:${subTask}"`);

    grunt.task.run(_.compact([
      !grunt.option('quick') && 'run:eslint',
      'licenses',
      'test:quick'
    ]));
  });

  // kibi: Add this task to allow ui tests to run without stopping when there is a failure
  grunt.registerTask('test:ui:dev', () => {
    grunt.config.set('functional_test_runner.functional.options.configOverrides.mochaOpts.bail', false);
    grunt.task.run(['test:ui']);
  });
  // kibi: end


  grunt.registerTask('quick-test', ['test:quick']); // historical alias
};
