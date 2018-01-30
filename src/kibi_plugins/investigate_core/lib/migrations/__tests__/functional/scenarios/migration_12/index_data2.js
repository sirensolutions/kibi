/*eslint max-len: 0*/
import { pkg } from '~/src/utils/package_json';

/**
 * Defines the following objects:
 *
 * - a configuration with valid Company dashboard and invalid ArticlesId dashboard set in kibi:defaultDashboardId
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    buildNum: pkg.build.number,
    'kibi:defaultDashboardId': 'ArticlesId'
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
  }
];
