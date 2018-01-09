/*eslint max-len: 0*/
import { pkg } from '~/src/utils/package_json';

/**
 * Defines the following objects:
 *
 * - a configuration with valid Company dashboard and valid Article dashboard and valid ArticlesId dashboard set in kibi:defaultDashboardId
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: pkg.kibi_version
    }
  },
  {
    buildNum: pkg.build.number,
    'kibi:defaultDashboardId': 'ArticleId'
  },
  {
    index: {
      _index: '.siren',
      _type: 'dashboard',
      _id: 'CompanyId',

    }
  },
  {
    title: 'Company'
  },
  {
    index: {
      _index: '.siren',
      _type: 'dashboard',
      _id: 'ArticleId',

    }
  },
  {
    title: 'Article'
  }
];
