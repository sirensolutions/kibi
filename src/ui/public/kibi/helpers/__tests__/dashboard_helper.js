const expect = require('expect.js');
const ngMock = require('ngMock');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');

const fakeSavedDashboards = [
  {
    id: 'ds1',
    savedSearchId: 'timebasedSavedSearch'
  },
  {
    id: 'ds2',
    savedSearchId: 'notTimebasedSavedSearch'
  },
  {
    id: 'ds3'
  }
];

const fakeSavedSearches = [
  {
    id: 'timebasedSavedSearch',
    searchSource: {
      index: function () {
        return {
          hasTimeField: function () {
            return true;
          }
        };
      }
    }
  },
  {
    id: 'notTimebasedSavedSearch',
    searchSource: {
      index: function () {
        return {
          hasTimeField: function () {
            return false;
          }
        };
      }
    }
  }
];

describe('Kibi Components', function () {
  describe('Dashboard Helper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    let dashboardHelper;

    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', 'dashboard');
        $provide.constant('kibiEnterpriseEnabled', false);
        $provide.constant('elasticsearchPlugins', ['siren-join']);
        $provide.service('savedDashboards', (Promise, Private) => {
          return mockSavedObjects(Promise, Private)('savedDashboards', fakeSavedDashboards);
        });
        $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', fakeSavedSearches));
      });

      ngMock.inject(function (Private) {
        dashboardHelper = Private(require('ui/kibi/helpers/dashboard_helper'));
      });
    });

    it('getTimeDependentDashboards should return only 1', function (done) {
      const expectedDashboards = [
        {
          id: 'ds1',
          savedSearchId: 'timebasedSavedSearch'
        }
      ];

      dashboardHelper.getTimeDependentDashboards().then(function (dashboards) {
        expect(dashboards).to.eql(expectedDashboards);
        done();
      }).catch(done);
    });
  });
});
