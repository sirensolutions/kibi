define(function (require) {
  require('components/sindicetech/st_nav_bar/st_nav_bar');

  describe('Kibi Components', function () {
    describe('Navigation Bar', function () {
      var $rootScope;
      var $timeout;
      var _ = require('lodash');
      var $httpBackend;
      var sinon = require('test_utils/auto_release_sinon');
      var dashboardGroupHelper;
      var Promise;
      var urlHelper;

      beforeEach(function () {
        module('kibana', function ($provide) {
          $provide.service('$route', function () {
            return {
              reload: _.noop
            };
          });
        });

        inject(function (Private, $injector, _$timeout_, _$rootScope_, $compile, _Promise_) {
          Promise = _Promise_;
          $timeout = _$timeout_;
          $httpBackend = $injector.get('$httpBackend');
          $rootScope = _$rootScope_;
          $compile('<st-nav-bar></st-nav-bar>')($rootScope);
          dashboardGroupHelper = Private(require('components/kibi/dashboard_group_helper/dashboard_group_helper'));
          urlHelper = Private(require('components/kibi/url_helper/url_helper'));
        });
      });

      var init = false;

      function initStubs(dashboardGroups, changes) {
        var groups = _.map(dashboardGroups, function (group) {
          return { id: group.id };
        });

        if (init) {
          dashboardGroupHelper.computeGroups.returns(Promise.resolve(groups));
          dashboardGroupHelper.updateDashboardGroups.returns(changes);
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
          sinon.stub(dashboardGroupHelper, 'updateDashboardGroups').returns(changes);
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
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('$routeChangeSuccess');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
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
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('$routeChangeSuccess');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(2);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(undefined);
        expect($rootScope.dashboardGroups[1].id).to.be('toto');
        expect($rootScope.dashboardGroups[1].count).to.be(42);
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

        sinon.stub(urlHelper, 'isItDashboardUrl').returns(true);

        initStubs(dashboardGroups, {});
        var response = $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs');
        response.respond(200, countOnTabsResponse);
        $rootScope.$broadcast('$routeChangeSuccess');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);

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

        expect($rootScope.dashboardGroups).to.have.length(2);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
        expect($rootScope.dashboardGroups[1].id).to.be('toto');
        expect($rootScope.dashboardGroups[1].count).to.be(24);
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
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('$routeChangeSuccess');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);

        // fire again
        $rootScope.$broadcast('$routeChangeSuccess');

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
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

        sinon.stub(urlHelper, 'isItDashboardUrl').returns(true);

        initStubs(dashboardGroups, {});
        var response = $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs');
        response.respond(200, countOnTabsResponse);
        $rootScope.$broadcast('$routeChangeSuccess');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(2);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
        expect($rootScope.dashboardGroups[1].id).to.be('john');
        expect($rootScope.dashboardGroups[1].count).to.be(42);

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

        expect($rootScope.dashboardGroups).to.have.length(2);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
        expect($rootScope.dashboardGroups[1].id).to.be('john');
        expect($rootScope.dashboardGroups[1].count).to.be(24);
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

        sinon.stub(urlHelper, 'isItDashboardUrl').returns(true);
        sinon.stub(urlHelper, 'shouldUpdateCountsBasedOnLocation').returns(true);

        initStubs(dashboardGroups, {});
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('$locationChangeSuccess');
        $timeout.flush();
        $timeout.verifyNoPendingTasks();
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
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
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('kibi:dashboard:changed');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
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
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('kibi:update-tab-counts');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
      });

      it('should update counts on kibi:autorefresh', function () {
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
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('kibi:autorefresh');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);
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
        $httpBackend.whenPOST('elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        $rootScope.$broadcast('kibi:dashboard:changed');
        $httpBackend.flush();

        expect($rootScope.dashboardGroups).to.have.length(1);
        expect($rootScope.dashboardGroups[0].id).to.be('fake');
        expect($rootScope.dashboardGroups[0].count).to.be(42);

        $rootScope.$broadcast('kibi:dashboardgroup:changed');
        expect($rootScope.dashboardGroups).to.not.be.ok();
      });
    });
  });
});
