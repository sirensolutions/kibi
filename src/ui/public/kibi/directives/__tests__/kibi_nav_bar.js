import ngMock from 'ng_mock';
import expect from 'expect.js';
import MockState from 'fixtures/mock_state';
import angular from 'angular';
import sinon from 'auto-release-sinon';
import _ from 'lodash';
import KibiNavBarHelperProvider from 'ui/kibi/directives/kibi_nav_bar_helper';
import 'ui/kibi/directives/kibi_nav_bar';

let kibiState;
let Promise;
let $rootScope;
let kibiNavBarHelper;

describe('Kibi Components', function () {
  describe('Navigation Bar', function () {
    beforeEach(function () {
      ngMock.module('kibana', ($provide) => {
        $provide.constant('elasticsearchPlugins', ['siren-platform']);
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardTitle', '');

        $provide.service('getAppState', () => {
          return function () {
            new MockState({});
          };
        });

        $provide.service('globalState', () => new MockState({}));

        kibiState = new MockState({
          init: _.noop,
          _getCurrentDashboardId: () => 'aaa'
        });
        $provide.service('kibiState', () => kibiState);
      });

      ngMock.inject(function (_Promise_, Private, _$rootScope_, $compile) {
        Promise = _Promise_;
        kibiNavBarHelper = Private(KibiNavBarHelperProvider);
        $rootScope = _$rootScope_;
        $rootScope.chrome = {
          getBasePath: () => ''
        };

        const $elem = angular.element('<kibi-nav-bar chrome="chrome"></kibi-nav-bar>');
        $compile($elem)($rootScope);
      });
    });

    it('should recompute groups when the currently displayed dashboard is changed to another', function () {
      const stubComputeDashboardsGroup = sinon.stub(kibiNavBarHelper, 'computeDashboardsGroups').returns(Promise.resolve());

      $rootScope.$digest();
      sinon.stub(kibiState, '_getCurrentDashboardId').returns('bbb');
      $rootScope.$digest();

      expect(stubComputeDashboardsGroup.calledWith('current dashboard changed')).to.be(true);
    });

    it('should update counts on kibi:dashboard:changed', function () {
      const stubComputeDashboardsGroup = sinon.stub(kibiNavBarHelper, 'computeDashboardsGroups').returns(Promise.resolve());
      const stubUpdateAllCounts = sinon.stub(kibiNavBarHelper, 'updateAllCounts').returns(Promise.resolve());

      $rootScope.$broadcast('kibi:dashboard:changed', 'luke');
      $rootScope.$digest();

      expect(stubComputeDashboardsGroup.calledWith('Dashboard changed')).to.be(true);
      expect(stubUpdateAllCounts.calledWith([ 'luke' ], 'kibi:dashboard:changed event')).to.be(true);
    });

    it('should recompute dashboardGroups on kibi:dashboardgroup:changed', function () {
      const stubComputeDashboardsGroup = sinon.stub(kibiNavBarHelper, 'computeDashboardsGroups').returns(Promise.resolve());

      $rootScope.$broadcast('kibi:dashboardgroup:changed', 'luke');
      $rootScope.$digest();

      expect(stubComputeDashboardsGroup.calledWith('Dashboard group changed')).to.be(true);
    });
  });
});
