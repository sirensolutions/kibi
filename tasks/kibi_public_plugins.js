module.exports = function (grunt) {
  var https = require('https');
  var wreck = require('wreck');
  var fs = require('fs');
  var _ = require('lodash');
  var Promise = require('bluebird');
  const DecompressZip = require('@bigfunger/decompress-zip');

  var archives = [
    {
      url: 'https://github.com/sirensolutions/kibi_radar_vis/archive/4.5.3.zip',
      dest: '/tmp/kibi_radar_vis.zip'
    },
    {
      url: 'https://github.com/sirensolutions/kibi_wordcloud_vis/raw/4.6.3-1/target/kibi_wordcloud_vis-4.6.3-1.zip',
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

  var download = function (url, dest) {
    grunt.log.write('Downloading ' + url + '\n');
    return new Promise(function (fulfill, reject) {
      var file = fs.createWriteStream(dest);
      var request = wreck.request('GET', url, {redirects: 3}, function (err, res) {
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

  var extractArchive = function (tempArchiveFile, pathToUnzip) {
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
    var downloadPromises = [];
    _.each(archives, function (archive) {
      downloadPromises.push(download(archive.url, archive.dest));
    });

    Promise.all(downloadPromises).then(function () {
      var unzipPromises = [];
      _.each(archives, function (archive) {
        unzipPromises.push(extractArchive(archive.dest, 'build/kibana/installedPlugins'));
      });
      return Promise.all(unzipPromises);
    })
    .nodeify(this.async())
    .catch(grunt.fail.fatal);
  });

};
