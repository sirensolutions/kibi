/*eslint max-len: 0*/
import { pkg } from '~/src/utils/package_json';

/**
 * Defines the following objects:
 *
 * - a configuration with a valid Company dashboard
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
