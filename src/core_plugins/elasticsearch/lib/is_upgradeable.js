import semver from 'semver';
const preReleaseRegex = /(\d+\.\d+\.\d+)-(rc|alpha|beta)-?(\d+)/i;

function computePreReleaseIndex(matches) {
  const version = matches[1];
  const specifier = matches[2];
  let index = parseInt(matches[3], 10);
  switch (specifier.toLowerCase()) {
    case 'alpha':
      index = 100 + index;
      break;
    case 'beta':
      index = 200 + index;
      break;
    case 'rc':
      index = 300 + index;
      break;
  }
  return [
    version,
    index
  ];
}

module.exports = function (server, doc) {
  const config = server.config();
  if (/snapshot/i.test(doc._id)) return false;
  if (!doc._id) return false;
  // kibi: use kibi version instead of kibana's
  if (doc._id === config.get('pkg.kibiVersion')) return false;

  let preReleaseIndex = Infinity;
  let packagePreReleaseIndex = Infinity;
  let packageVersion = config.get('pkg.kibiVersion'); // kibi: use kibi version instead of kibana's
  let version = doc._id;
  const preReleaseMatches = doc._id.match(preReleaseRegex);
  const packagePreReleaseMatches = config.get('pkg.kibiVersion').match(preReleaseRegex); // kibi: use kibi version instead of kibana's

  if (preReleaseMatches) {
    [version, preReleaseIndex] = computePreReleaseIndex(preReleaseMatches);
  }

  if (packagePreReleaseMatches) {
    [packageVersion, packagePreReleaseIndex] = computePreReleaseIndex(packagePreReleaseMatches);
  }

  // kibi: allow upgrade from a release to a snapshot
  let isSnapshot = false;
  if (packageVersion.endsWith('-SNAPSHOT')) {
    isSnapshot = true;
    packageVersion = packageVersion.substring(0, packageVersion.length - 9);
  }

  try {
    if (semver.eq(version, packageVersion)) {
      return isSnapshot || preReleaseIndex < packagePreReleaseIndex;
    }
    return semver.lt(version, packageVersion);
  } catch (e) {
    return false;
  }
  return true;
};
