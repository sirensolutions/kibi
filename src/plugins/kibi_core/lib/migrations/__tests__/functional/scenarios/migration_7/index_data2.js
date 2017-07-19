/*eslint max-len: 0*/
import requirefrom from 'requirefrom';
const fromRoot = requirefrom('src/utils')('fromRoot');
const packageJson = require(fromRoot('package.json'));

/**
 * Defines the following objects:
 *
 * - a configuration without kibi:defaultDashboardTitle
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: packageJson.kibi_version
    }
  },
  {
    buildNum: packageJson.build.number,
    'kibi:defaultDashboardTitle': 'Articles'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'dashboard',
      _id: 'Test-Company',

    }
  },
  {
    title: 'Company'
  }
];
