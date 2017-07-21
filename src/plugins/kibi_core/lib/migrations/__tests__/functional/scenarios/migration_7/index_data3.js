/*eslint max-len: 0*/
import requirefrom from 'requirefrom';
const fromRoot = requirefrom('src/utils')('fromRoot');
const packageJson = require(fromRoot('package.json'));

/**
 * Defines the following objects:
 *
 * - a configuration with valid Company dashboard and valid Article dashboard and valid ArticlesId dashboard set in kibi:defaultDashboardId
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
    'kibi:defaultDashboardId': 'ArticlesId'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'dashboard',
      _id: 'CompanyId',

    }
  },
  {
    title: 'Company'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'dashboard',
      _id: 'ArticleId',

    }
  },
  {
    title: 'Article'
  }
];
