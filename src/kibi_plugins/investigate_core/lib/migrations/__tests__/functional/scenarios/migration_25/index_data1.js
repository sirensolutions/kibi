/**
 * Defines the following objects:
 *
 * - a configuration with a siren:zoom, siren:enableAllDashboardsCounts and siren:shieldAuthorizationWarning
 */
module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'config',
      _id: 'siren'
    }
  },
  {
    buildNum: '12345',
    'siren:zoom': 'foo',
    'siren:enableAllDashboardsCounts': true,
    'siren:shieldAuthorizationWarning': true
  }
];