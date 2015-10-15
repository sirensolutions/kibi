var rp = require('request-promise');
var indexHelper = require('../lib/kibi/index_helper');

if (process.argv.length !== 6) {
  console.log(
    'Wrong number of parameters. Try:\n' +
    process.argv[0] + ' ' + process.argv[1] + ' OLD_KEY NEW_CIPHER NEW_KEY PATH_TO_KIBIYML'
  );

  process.exit(1);
}

var oldkey    = process.argv[2];
var algorithm = process.argv[3];
var key       = process.argv[4];
var path      = process.argv[5];

if (oldkey === key) {
  console.log('New key same as old! Will re-encrypt values in case new cipher differ');
}

console.log('Starting reencryption');
indexHelper.rencryptAllValuesInKibiIndex(oldkey, algorithm, key, path).then(function (report) {
  console.log(report.join('\n'));
  // reload config
}).catch(function (err) {
  console.log('Something went wrong. See details:');
  console.log(err);
});








