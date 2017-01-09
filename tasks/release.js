module.exports = function (grunt) {
  const readline = require('readline');
  const url = require('url');
  const fs = require('fs');
  const path = require('path');
  const _ = require('lodash');

  // build, then zip and upload to s3
  grunt.registerTask('release', [
    '_release:confirmUpload',
    'build',
    '_release:loadS3Config',
    'aws_s3:staging',
    '_release:complete'
  ]);

  grunt.registerTask('_release:confirmUpload', function () {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.on('close', this.async());
    rl.question('Do you want to actually upload the files to s3 after building?, [N/y] ', function (resp) {
      const debug = resp.toLowerCase().trim()[0] !== 'y';

      grunt.config.set('aws_s3.staging.options.debug', debug);

      rl.close();
    });
  });

  // collect the key and secret from the .aws-config.json file, finish configuring the s3 task
  grunt.registerTask('_release:loadS3Config', function () {
    const config = grunt.file.readJSON('.aws-config.json');

    grunt.config('aws_s3.options', {
      accessKeyId: config.key,
      secretAccessKey: config.secret,
      bucket: config.bucket || grunt.config.get('aws_s3.options.bucket'),
      region: config.region
    });
  });

  grunt.registerTask('_release:setS3Uploads', function () {
    const { sha, version } = grunt.config.get('build');

    const uploads = grunt.config.get('platforms')
    .reduce(function (files, platform) {
      return files.concat(
        platform.tarName,
        platform.tarName + '.sha1.txt',
        platform.zipName,
        platform.zipName + '.sha1.txt',
        platform.rpmName,
        platform.rpmName && platform.rpmName + '.sha1.txt',
        platform.debName,
        platform.debName && platform.debName + '.sha1.txt'
      );
    }, [])
    .filter(function (filename) {
      if (_.isUndefined(filename)) return false;
      try {
        fs.accessSync('target/' + filename, fs.F_OK);
        return true;
      } catch (e) {
        return false;
      }
    })
    .map(function (filename) {
      const src = `target/${filename}`;

      const shortSha = sha.substr(0, 7);
      const dest = `kibana/staging/${version}-${shortSha}/kibana/${filename}`;

      return { src, dest };
    });
    grunt.config.set('s3.release.upload', uploads);
  });

  grunt.registerTask('_release:complete', function () {
    const { sha, version } = grunt.config.get('build');
    const config = grunt.config.get('aws_s3.staging.files');

    grunt.log.ok('Builds uploaded');

    fs.readdirSync('./target').forEach((file) => {
      if (path.extname(file) !== '.txt') {
        const link = url.format({
          protocol: 'https',
          hostname: 'download.elastic.co',
          pathname: config[0].dest + file
        });

        grunt.log.writeln(link);
      }
    });
  });
};
