import ngMock from 'ng_mock';

describe('Kibi Sequential Join Visualization Controller', function () {
 const fakeSavedDashboards = [
    {
      id: 'myCurrentDashboard',
      title: 'myCurrentDashboard',
      savedSearchId: 'Articles'
    },
    {
      id: 'dashboard saved search missing',
      title: 'dashboard saved search missing',
      savedSearchId: 'missing'
    },
    {
      id: 'Companies',
      title: 'Companies',
      savedSearchId: 'Companies'
    },
    {
      id: 'Test',
      title: 'Test',
      savedSearchId: 'Companies'
    }
  ];

  function init({ enableAcl = true, currentDashboardId = 'myCurrentDashboard' } = {}) {
    ngMock.module('kibana/kibi_sequential_join_vis', $provide => {
      $provide.constant('kacConfiguration', { acl: { enabled: enableAcl } });

      $provide.service('getAppState', function () {
        return () => new MockState({ filters: [] });
      });
    });

    chrome.getInjected = function () {
      return {
        acl: {
          enabled: enableAcl
        }
      };
    };

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboard', fakeSavedDashboards));
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', fakeSavedSearches));
    });

    ngMock.inject(function (_kibiState_, _$rootScope_, $controller) {
      kibiState = _kibiState_;
      kibiState._getCurrentDashboardId = sinon.stub().returns(currentDashboardId);
      kibiState.isSirenJoinPluginInstalled = sinon.stub().returns(true);

      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $scope.vis = {
        params: {
          buttons: []
        }
      };

      const $element = $('<div>');
      $controller('KibiSequentialJoinVisController', { $scope, $element });
    });
  }

  noDigestPromises.activateForSuite();

});
