import noDigestPromises from 'test_utils/no_digest_promises';
import { DashboardHelperFactory } from 'ui/kibi/helpers/dashboard_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';

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
          isTimeBased: function () {
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
          isTimeBased: function () {
            return false;
          }
        };
      }
    }
  }
];

describe('Kibi Components', function () {
  describe('Dashboard Helper', function () {

    noDigestPromises.activateForSuite();

    let dashboardHelper;

    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', 'dashboard');
        $provide.service('savedDashboards', (Promise, Private) => {
          return mockSavedObjects(Promise, Private)('savedDashboards', fakeSavedDashboards);
        });
        $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', fakeSavedSearches));
      });

      ngMock.inject(function (Private) {
        dashboardHelper = Private(DashboardHelperFactory);
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
