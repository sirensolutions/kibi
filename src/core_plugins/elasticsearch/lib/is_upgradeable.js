import semver from 'semver';

// kibi: check alpha,beta and rc not only rc
const preReleaseRegex = /(\d+\.\d+\.\d+)-(rc|alpha|beta)-?(\d+)/i;

// kibi: compute pre-release index
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

/**
 * Some Kibi versions use the dash, which is considered a pre-release by semver.
 */
function lowerThan(version, packageVersion) {
  const dashRe = /^(\d\.\d\.\d)-(\d?)$/;
  let semVersion = version;
  let versionIncrement = 0;
  let semPackageVersion = packageVersion;
  let packageVersionIncrement = 0;

  let matches = version.match(dashRe);
  if (matches) {
    semVersion = matches[1];
    versionIncrement = parseInt(matches[2], 10);
  }

  matches = packageVersion.match(dashRe);
  if (matches) {
    semPackageVersion = matches[1];
    packageVersionIncrement = parseInt(matches[2], 10);
  }

  if (semver.eq(semVersion, semPackageVersion)) {
    return versionIncrement < packageVersionIncrement;
  }
  return semver.lt(version, packageVersion);
}

export default function (server, configSavedObject) {
  const config = server.config();
  if (/snapshot/i.test(configSavedObject.id)) return false; // kibi: removed alpha,beta from reges
  if (!configSavedObject.id) return false;
  if (configSavedObject.id === config.get('pkg.kibiVersion')) return false;

  let rcRelease = Infinity;
  let packageRcRelease = Infinity;
  let packageVersion = config.get('pkg.kibiVersion'); // kibi: use kibi version instead of kibana's
  let version = configSavedObject.id;
  const matches = configSavedObject.id.match(preReleaseRegex);
  const packageMatches = config.get('pkg.kibiVersion').match(preReleaseRegex); // kibi: use kibi version instead of kibana's

  // kibi: compute prerelease index
  if (matches) {
    [version, rcRelease] = computePreReleaseIndex(matches);
  }

  if (packageMatches) {
    [packageVersion, packageRcRelease] = computePreReleaseIndex(packageMatches);
  }
  //kibi: end

  // kibi: allow upgrade from a release to a snapshot
  let isSnapshot = false;
  if (packageVersion.endsWith('-SNAPSHOT')) {
    isSnapshot = true;
    packageVersion = packageVersion.substring(0, packageVersion.length - 9);
  }

  try {
    if (semver.eq(version, packageVersion)) {
      return isSnapshot || rcRelease < packageRcRelease;
    }
    // kibi: handle dash versions
    return lowerThan(version, packageVersion);
  } catch (e) {
    return false;
  }
  return true;
}
