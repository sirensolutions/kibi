import maven from 'maven';
import fs from 'fs';

module.exports = function (grunt) {

  grunt.registerTask('getGremlin', function () {
    const done = this.async();

    const mvn = maven.create();
    mvn.execute('dependency:copy', {
      remoteRepositories: 'https://artifactory.siren.io/artifactory/libs-snapshot-local/',
      artifact: 'solutions.siren.unipop:gremlin-server:10.0.0-SNAPSHOT',
      outputDirectory: './gremlin_server',
      'mdep.useBaseVersion': true,
      transitive: false
    }).then(() => {
      // We rename here as command line for maven does not currently support changing name
      // of downloaded artifact: https://issues.apache.org/jira/browse/MDEP-446
      fs.rename('./gremlin_server/gremlin-server-10.0.0-SNAPSHOT.jar', './gremlin_server/gremlin-server.jar', function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    }).catch(done);
  });

  grunt.registerTask('removeGremlin', function () {
    try {
      fs.rmdir('./gremlin_server');
      grunt.log.ok('Successfully deleted Gremlin Server');
    } catch (err) {
      grunt.log.error('Failed to delete Gremlin Server');
    }
  });
};
