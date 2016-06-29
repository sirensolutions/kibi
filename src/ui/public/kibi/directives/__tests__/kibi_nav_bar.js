const MockState = require('fixtures/mock_state');
const ngMock = require('ngMock');
const expect = require('expect.js');
const angular = require('angular');
const _ = require('lodash');
const sinon = require('auto-release-sinon');
let dashboardGroupHelper;
let Promise;
let urlHelper;
let $httpBackend;
let $rootScope;
let $timeout;
let $elem;
let $location;
let kibiState;

require('ui/kibi/directives/kibi_nav_bar');

describe('Kibi Components', function () {
  describe('Navigation Bar', function () {

    beforeEach(function () {
      ngMock.module('kibana', 'kibana/courier', 'kibana/global_state', ($provide) => {
        $provide.service('$route', function () {
          return {
            reload: _.noop
          };
        });

        $provide.service('getAppState', () => {
          return function () { return new MockState({ filters: [] }); };
        });

        $provide.service('globalState', () => {
          return new MockState({ filters: [] });
        });

        $provide.constant('kibiEnterpriseEnabled', false);
        $provide.constant('kbnDefaultAppId', 'dashboard');
        $provide.constant('kibiDefaultDashboardId', '');
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });


      ngMock.inject(function (_$location_, _kibiState_, Private, $injector, _$timeout_, _$rootScope_, $compile, _Promise_) {
        $location = _$location_;
        kibiState = _kibiState_;
        Promise = _Promise_;
        $timeout = _$timeout_;
        $httpBackend = $injector.get('$httpBackend');
        $rootScope = _$rootScope_;
        $rootScope.chrome = {
          getBasePath: function () {return '';}
        };

        $elem = angular.element('<kibi-nav-bar chrome="chrome"></kibi-nav-bar>');
        $compile($elem)($rootScope);
        dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));
        urlHelper = Private(require('ui/kibi/helpers/url_helper'));
      });
    });

    var init = false;

    function initStubs(dashboardGroups, changes) {
      var groups = _.map(dashboardGroups, function (group) {
        return { id: group.id };
      });

      if (init) {
        dashboardGroupHelper.computeGroups.returns(Promise.resolve(groups));
        _.each(dashboardGroups, function (group, i) {
          var query = {
            query: group.query ? {} : undefined,
            indexPatternId: 'id',
            groupIndex: i
          };
          dashboardGroupHelper.getCountQueryForSelectedDashboard
          .withArgs(sinon.match.any, i).returns(Promise.resolve(query));
        });
      } else {
        sinon.stub(dashboardGroupHelper, 'computeGroups').returns(Promise.resolve(groups));
        var stub = sinon.stub(dashboardGroupHelper, 'getCountQueryForSelectedDashboard');
        _.each(dashboardGroups, function (group, i) {
          var query = {
            query: group.query ? {} : undefined,
            indexPatternId: 'id',
            groupIndex: i
          };
          stub.withArgs(sinon.match.any, i).returns(Promise.resolve(query));
        });
      }
      init = true;
    }

    afterEach(function () {
      init = false;
      $httpBackend.verifyNoOutstandingRequest();
    });

    it('Update counts with route change', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$routeChangeSuccess');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
    });

    it('skip dashboard groups that do not have a query set', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: false
        },
        {
          id: 'toto',
          query: true
        }
      ];

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$routeChangeSuccess');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(2);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(undefined);
      expect($elem.isolateScope().dashboardGroups[1].id).to.be('toto');
      expect($elem.isolateScope().dashboardGroups[1].count).to.be(42);
    });

    it('recomputes the counts if there is a new group', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      $location.path('/dashboard/dashboard1');

      initStubs(dashboardGroups, {});
      var response = $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs');
      response.respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$routeChangeSuccess');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);

      // add a group
      dashboardGroups = [
        {
          id: 'fake',
          query: true
        },
        {
          id: 'toto',
          query: true
        }
      ];
      countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          },
          {
            hits: {
              total: 24
            }
          }
        ]
      };
      initStubs(dashboardGroups, {});
      response.respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$routeChangeSuccess');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(2);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
      expect($elem.isolateScope().dashboardGroups[1].id).to.be('toto');
      expect($elem.isolateScope().dashboardGroups[1].count).to.be(24);
    });

    it('should not recompute counts if the previous ES query is the same', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$routeChangeSuccess');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);

      // fire again
      $rootScope.$broadcast('$routeChangeSuccess');

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
    });

    it('update counts only for the modified group', function () {
      // set the dashboardgroup
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          },
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        },
        {
          id: 'john',
          query: true
        }
      ];

      $location.path('/dashboard/dashboard1');

      initStubs(dashboardGroups, {});
      var response = $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs');
      response.respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$routeChangeSuccess');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(2);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
      expect($elem.isolateScope().dashboardGroups[1].id).to.be('john');
      expect($elem.isolateScope().dashboardGroups[1].count).to.be(42);

      // compare with previous dashboardGroups
      countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 24
            }
          }
        ]
      };
      var changes = {
        indexes: [ 1 ]
      };

      initStubs(dashboardGroups, changes);
      response.respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$routeChangeSuccess');
      $rootScope.$apply();
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(2);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
      expect($elem.isolateScope().dashboardGroups[1].id).to.be('john');
      expect($elem.isolateScope().dashboardGroups[1].count).to.be(24);
    });

    it('should update counts on location change', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      $location.path('/dashboard/dashboard1');
      sinon.stub(urlHelper, 'shouldUpdateCountsBasedOnLocation').returns(true);

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      $rootScope.$broadcast('$locationChangeSuccess');
      $timeout.flush();
      $timeout.verifyNoPendingTasks();
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
    });

    it('should update counts on kibi:dashboard:changed', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      $rootScope.$broadcast('kibi:dashboard:changed');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
    });

    it('should update counts on kibi:update-tab-counts', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      kibiState.enableRelation({});
      kibiState.save();
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
    });

    it('should update counts on courier:searchRefresh', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      $rootScope.$broadcast('courier:searchRefresh');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);
    });

    it('should remove dashboardGroups on kibi:dashboardgroup:changed', function () {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };
      var dashboardGroups = [
        {
          id: 'fake',
          query: true
        }
      ];

      initStubs(dashboardGroups, {});
      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      $rootScope.$broadcast('kibi:dashboard:changed');
      $httpBackend.flush();

      expect($elem.isolateScope().dashboardGroups).to.have.length(1);
      expect($elem.isolateScope().dashboardGroups[0].id).to.be('fake');
      expect($elem.isolateScope().dashboardGroups[0].count).to.be(42);

      $rootScope.$broadcast('kibi:dashboardgroup:changed');
      expect($elem.isolateScope().dashboardGroups).to.not.be.ok();
    });
  });
});
