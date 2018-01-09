/*eslint max-len: 0*/

/**
 * Defines the following objects:
 *
 * - two visualization with a pageSize, one of them int other one string
 * - one config without discover:sampleSize
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'visualization',
      _id: 'vis'
    }
  },
  {
    visState: '{"title":"vis","type":"kibi-data-table","params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":"40"}}'
  },
  {
    index: {
      _index: '.siren',
      _type: 'visualization',
      _id: 'vis1'
    }
  },
  {
    visState: '{"title":"vis1","type":"kibi-data-table","params":{"clickOptions":[{"columnField":"rnews:headline","type":"select","targetDashboardId":"Graph"}],"pageSize":30}}'
  },
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: 'kibi'
    }
  },
  {
    'kibi:relationalPanel': true
  }
];
