module.exports = function (grunt) {
  const https = require('https');
  const wreck = require('wreck');
  const fs = require('fs');
  const _ = require('lodash');
  const Promise = require('bluebird');
  const DecompressZip = require('@bigfunger/decompress-zip');
  const tempFolder = require('os').tmpdir(); // siren: add OS check and set temp folder location
  const rimraf = require('rimraf'); //siren: Added to remove temp files after processing

>>>>>>> Remove temp files after extraction
  const archives = [
    {
      url: 'https://github.com/sirensolutions/kibi_radar_vis/releases/download/5.2.2/kibi_radar_vis-5.2.2.zip',
      dest: `${tempFolder}/kibi_radar_vis.zip` // siren: Add temp folder location to filepath
    },
    {
      url: 'https://github.com/sirensolutions/kibi_timeline_vis/releases/download/5.2.2-SNAPSHOT/kibi_timeline_vis-5.2.2-SNAPSHOT.zip',
      dest: `${tempFolder}/kibi_timeline_vis.zip` //siren: Add temp folder location to filepath
    }
  ];

  const download = function (url, dest) {
    grunt.log.write('Downloading ' + url + '\n');
    return new Promise(function (fulfill, reject) {
      const file = fs.createWriteStream(dest);
      const request = wreck.request('GET', url, {redirects: 3}, function (err, res) {
        if (err) {
          reject(err);
          return;
        }

        res.pipe(file);
        file.on('finish', function () {
          file.close(function () {
            fulfill(true);
          });
        });
      }).on('error', function (err) {
        fs.unlink(dest);
        reject(err);
      });
    });
  };

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


  grunt.registerTask('kibi_public_plugins', '', function () {
    const downloadPromises = [];
    _.each(archives, function (archive) {
      downloadPromises.push(download(archive.url, archive.dest));
    });

    Promise.all(downloadPromises).then(function () {
      const unzipPromises = [];
      _.each(archives, function (archive) {
        unzipPromises.push(extractArchive(archive.dest, 'build/kibana/plugins'));
      });
      return Promise.all(unzipPromises);
    })
    .nodeify(this.async())
    .catch(grunt.fail.fatal);
  });

};
