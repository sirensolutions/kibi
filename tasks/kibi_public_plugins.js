module.exports = function (grunt) {
  const https = require('https');
  const wreck = require('wreck');
  const fs = require('fs');
  const _ = require('lodash');
  const Promise = require('bluebird');
  const DecompressZip = require('@bigfunger/decompress-zip');

  const archives = [
    {
      url: 'https://github.com/sirensolutions/kibi_radar_vis/releases/download/4.6.4-4/kibi_radar_vis-4.6.4-4.zip',
      dest: '/tmp/kibi_radar_vis.zip'
    },
    {
      url: 'https://github.com/sirensolutions/kibi_wordcloud_vis/releases/download/4.6.4-4/kibi_wordcloud_vis-4.6.4-4.zip',
      dest: '/tmp/kibi_wordcloud_vis.zip'
    },
    {
      url: 'https://github.com/sirensolutions/kibi_timeline_vis/raw/4.6.4/target/kibi_timeline_vis-4.6.4.zip',
      dest: '/tmp/kibi_timeline_vis.zip'
    },
    {
      url: 'https://github.com/sirensolutions/heatmap/releases/download/1.0.1/heatmap.zip',
      dest: '/tmp/heatmap_vis.zip'
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

      unzipper.on('extract', resolve);
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
        unzipPromises.push(extractArchive(archive.dest, 'build/kibana/installedPlugins'));
      });
      return Promise.all(unzipPromises);
    })
    .nodeify(this.async())
    .catch(grunt.fail.fatal);
  });

};
