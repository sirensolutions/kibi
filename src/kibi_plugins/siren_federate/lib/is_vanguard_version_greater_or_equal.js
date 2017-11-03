import semver from 'semver';

export function isVanguardVersionGreaterOrEqual(actual, test) {
  const a = {
    major: semver.major(actual),
    minor: semver.minor(actual),
    patch: semver.patch(actual),
    prerelease: semver.prerelease(actual)
  };

  const t = {
    major: semver.major(test),
    minor: semver.minor(test),
    patch: semver.patch(test),
    prerelease: semver.prerelease(test)
  };

  if (
    a.major === t.major &&
    a.minor === t.minor &&
    a.patch === t.patch &&
    a.prerelease >= t.prerelease) {
    return true;
  }
  return false;
};
