import maven from 'maven';
import fs from 'fs';
import { esTestConfig } from "../src/test_utils/es/es_test_config";
import crypto from 'crypto';
import DecompressZip from '@bigfunger/decompress-zip';
import rimraf from 'rimraf';

module.exports = function (grunt) {
  const extractArchive = function (tempArchiveFile, pathToUnzip) {
    grunt.log.write('Extracting archive ' + tempArchiveFile + '\n');
    return new Promise(function (resolve, reject) {
      const unzipper = new DecompressZip(tempArchiveFile);

      unzipper.on('error', reject);

      unzipper.extract({
        path: pathToUnzip
      });

      unzipper.on('extract', () => {
        rimraf(tempArchiveFile, resolve);
      });
    });
  };

  grunt.registerTask('getFederate', function () {
    // If we are not doing a fresh download then we copy federate
    // plugin to existing elasticsearch
    if (grunt.option('esvm-no-fresh')) {
      grunt.task.run(['downloadFederate']);
    }
    else {
      // Else we have to download new esvm, install our plugin and set
      // the option to not download new esvm later during test run
      // Unfortunately we have to start elasticsearch too as part of the task to download it.
      grunt.task.run([
        'esvm:ui',
        'downloadFederate',
        'esvm_shutdown:ui',
        'stopFreshDownload'
      ]);
    }
  });

  grunt.registerTask('stopFreshDownload', function (freshDownload) {
    grunt.config.set('esvm.options.fresh', false);
  });

  grunt.registerTask('downloadFederate', function () {
    const done = this.async();
    const mvn = maven.create();

    // Get the target dir for esvm by below hashing
    const esvmBinary = 'https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-' +
      grunt.config.get('pkg.version') + '.tar.gz';
    const hash = crypto.createHash('sha1').update(esvmBinary).digest('hex');
    const pluginTargetDir = esTestConfig.getDirectoryForEsvm('test') + '/' + hash + '/plugins/';

    // pkg.version should be the same value as our compatible elastic version
    // so we download plugin for the suitable elasticsearch although not the latest patch version.
    const version = grunt.config.get('pkg.version') + '-' + grunt.config.get('pkg.kibi_version');

    // Download latest platform core with maven
    mvn.execute('dependency:copy', {
      remoteRepositories: 'https://artifactory.siren.io/artifactory/libs-snapshot-local/',
      artifact: 'io.siren:siren-federate:' + version + ':zip:plugin',
      outputDirectory: pluginTargetDir,
      'mdep.useBaseVersion': true,
      transitive: false,
      overWriteIfNew: true
    })
    .then(() => {
      // extract and then delete zip
      grunt.log.ok('Successfully downloaded Siren Federate to ' + pluginTargetDir);
      // Extract to the test directory for the ui tests
      const archiveDir = pluginTargetDir + '/siren-federate-' + version + '-plugin.zip';
      return extractArchive(archiveDir, pluginTargetDir);
    })
    .then(() => {
      // remove old plugin and rename extracted file
      rimraf(pluginTargetDir + 'siren-federate', function (err) {
        if (err && err.code === 'ENOENT') {
          // Siren Federate doens't exist
          grunt.log.ok('No existing Siren Federate plugin in elasticsearch. Creating...');
        } else if (err) {
          // other errors, e.g. maybe we don't have enough permission
          grunt.log.error('Error occurred while trying to remove old Siren Federate plugin');
          done(err);
        } else {
          grunt.log.ok('Existing Siren Federate plugin in elasticsearch. Replacing...');
        }

        // rename the plugin
        fs.rename(pluginTargetDir + 'elasticsearch',
          pluginTargetDir + 'siren-federate', function (err) {
            if (err) {
              done(err);
            }
            grunt.log.ok('Successfully extracted Siren Federate');
            done();
          });
      });
    })
    .catch(done);
  });
};
