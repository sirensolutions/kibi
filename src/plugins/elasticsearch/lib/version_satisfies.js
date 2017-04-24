const semver = require('semver');

module.exports = function (actual, supported) { // kibi: replaced expected with supported
  // kibi: support multiple ES versions
  try {
    const ver = cleanVersion(actual);
    for (const version of supported) {
      if (semver.satisfies(ver, version)) {
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
  // kibi: end

  function cleanVersion(version) {
    const match = version.match(/\d+\.\d+\.\d+/);
    if (!match) return version;
    return match[0];
  }
};
