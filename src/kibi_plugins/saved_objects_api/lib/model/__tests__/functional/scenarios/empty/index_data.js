import { pkg } from '~/src/utils/package_json';

/**
 * An empty .siren index.
 */
export default [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: pkg.kibi_version
    }
  },
  {
    buildNum: pkg.build.number,
    'dateFormat:tz': 'UTC'
  }
];
