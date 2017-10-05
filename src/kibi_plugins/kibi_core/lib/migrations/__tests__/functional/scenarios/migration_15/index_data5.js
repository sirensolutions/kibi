/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - one visualization without pageSize
 * - one config without discover:sampleSize
 */
module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'visualization',
      _id: 'vis'
    }
  },
  {
    visState: '{"title":"vis","type":"kibi-data-table","params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}]}}'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: 'conf'
    }
  },
  {
    'kibi:relationalPanel': true
  }
];
