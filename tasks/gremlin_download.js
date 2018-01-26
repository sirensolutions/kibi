import maven from 'maven';
import fs from 'fs';

module.exports = function (grunt) {

  const GREMLIN_SERVER_DIR = './gremlin_server';
  const GREMLIN_SERVER_PATH = GREMLIN_SERVER_DIR + '/gremlin-server.jar';

  grunt.registerTask('getGremlin', function () {
    const done = this.async();
    const mvn = maven.create();
    const version = grunt.config.get('pkg.kibi_version');

    mvn.execute('dependency:copy', {
      remoteRepositories: 'https://artifactory.siren.io/artifactory/libs-snapshot-local/',
      artifact: 'solutions.siren.unipop:gremlin-server:' + version,
      outputDirectory: GREMLIN_SERVER_DIR,
      'mdep.useBaseVersion': true,
      transitive: false
    }).then(() => {
      // We rename here as command line for maven does not currently support changing name
      // of downloaded artifact: https://issues.apache.org/jira/browse/MDEP-446
      if (fs.existsSync(GREMLIN_SERVER_PATH)) {
        const now = new Date();
        fs.rename(GREMLIN_SERVER_PATH, GREMLIN_SERVER_PATH + '.back-' + now, function (err) {
          if (err) {
            grunt.log.error('Could not rename existing Gremlin Server jar ', err);
            done(err);
          }
        });
      }
      fs.rename(GREMLIN_SERVER_DIR + '/gremlin-server-' + version + '.jar', GREMLIN_SERVER_PATH, function (err) {
        if (err) {
          done(err);
        }
        done();
      });
    }).catch(done);
  });

  grunt.registerTask('removeGremlin', function () {
    const done = this.async();
    fs.unlink(GREMLIN_SERVER_PATH, function (err) {
      if (err) {
        grunt.log.error('Failed to delete Gremlin Server jar', err);
        return done(err);
      }
      grunt.log.ok('Successfully deleted Gremlin Server');
      done();
    });
  });
};
