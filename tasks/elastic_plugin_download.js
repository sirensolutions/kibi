import maven from 'maven';
import fs from 'fs';
import { esTestConfig } from "../src/test_utils/es/es_test_config";
import crypto from 'crypto';

module.exports = function (grunt) {
  const DecompressZip = require('@bigfunger/decompress-zip');
  const rimraf = require('rimraf');


  const extractArchive = function (tempArchiveFile, pathToUnzip) {
    grunt.log.write('Extracting archive ' + tempArchiveFile + '\n');
    return new Promise(function (resolve, reject) {
      const unzipper = new DecompressZip(tempArchiveFile);

      unzipper.on('error', reject);

      unzipper.extract({
        path: pathToUnzip
      });

      unzipper.on('extract', () => {
        rimraf(tempArchiveFile, resolve); // siren: remove temp files on extraction end
      });
    });
  };

  grunt.registerTask('getVanguard', function () {
    // If we are not doing a fresh download then we copy vanguard
    // plugin to existing elasticsearch
    if (grunt.option('esvm-no-fresh')) {
      grunt.task.run(['downloadVanguard']);
    }
    else{
      // Else we have to download new esvm, install our plugin and set
      // the option to not download new esvm later during test run
      // Unfortunately we have to start elasticsearch too as part of the task to download it.
      grunt.task.run([
        'esvm:ui',
        'downloadVanguard',
        'esvm_shutdown:ui',
        'stopFreshDownload'
      ]);
    };
  });

  grunt.registerTask('stopFreshDownload', function (freshDownload) {
    grunt.config.set('esvm.options.fresh',false);
  });

  grunt.registerTask('downloadVanguard', function () {
    const done = this.async();
    const mvn = maven.create();

    // Get the target dir for esvm by below hashing
    const esvmBinary = 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-' +
      grunt.config.get('pkg.version') + '.tar.gz';
    const hash = crypto.createHash('sha1').update(esvmBinary).digest('hex');
    const pluginTargetDir = esTestConfig.getDirectoryForEsvm('test') + '/' + hash + '/plugins/';

    // pkg.version should be the same value as our compatible elastic version
    // so we download plugin for the suitable elasticsearch
    // The vanguard plugin does not use minor versioning from pkg.kibi_version
    // so we only get the first 2 digits
    const version = grunt.config.get('pkg.version') + '-' +
      grunt.config.get('pkg.kibi_version').substring(0, 2) + '-SNAPSHOT';

    // Download latest platform core with maven
    mvn.execute('dependency:copy', {
      remoteRepositories: 'https://artifactory.siren.io/artifactory/libs-snapshot-local/',
      artifact: 'solutions.siren:platform-core:' + version + ':zip:plugin',
      outputDirectory: pluginTargetDir,
      'mdep.useBaseVersion': true,
      transitive: false,
      'overWriteIfNew': true
    })
    .then(() => {
      // extract and then delete zip
      grunt.log.ok('Successfully downloaded Siren vanguard to ' + pluginTargetDir);
      // Extract to the test directory for the ui tests
      const archiveDir = pluginTargetDir + '/platform-core-' + version + '-plugin.zip';
      return extractArchive(archiveDir, pluginTargetDir);
    })
    .then(() => {
      // remove old plugin and rename extracted file
      rimraf(pluginTargetDir + 'siren-vanguard', function (err) {
        if(err && err.code === 'ENOENT') {
          // Siren Vanguard doens't exist
          grunt.log.ok('No existing Siren Vanguard plugin in elasticsearch. Creating...');
        } else if (err) {
          // other errors, e.g. maybe we don't have enough permission
          grunt.log.error('Error occurred while trying to remove old Siren Vanguard plugin');
          done(err);
        } else {
          grunt.log.ok('Existing Siren Vanguard plugin in elasticsearch. Replacing...');
        }

        // rename the plugin
        fs.rename(pluginTargetDir + 'elasticsearch',
          pluginTargetDir + 'siren-vanguard', function (err) {
            if (err) {
              done(err);
            }
            grunt.log.ok('Successfully extracted Siren Vanguard');
            done();
          });
      });
    })
    .catch(done);
  });
};
