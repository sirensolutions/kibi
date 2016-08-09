const sinon = require('auto-release-sinon');
const ngMock = require('ngMock');
const expect = require('expect.js');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const _ = require('lodash');

let kibiState;
let globalState;
let kibiNavBarHelper;
let $rootScope;
let $httpBackend;
let $timeout;

describe('Kibi Directives', function () {
  describe('KibiNavBar Helper', function () {

    function init({ dashboardsIdsInConnectedComponents = [], savedDashboards = [], dashboardGroups = [] }) {
      ngMock.module('kibana', ($provide) => {
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
      });

      ngMock.inject(function (_globalState_, _kibiState_, _$httpBackend_, _$timeout_, _$rootScope_, Private, Promise) {
        globalState = _globalState_;
        kibiState = _kibiState_;
        $timeout = _$timeout_;
        $rootScope = _$rootScope_;
        kibiNavBarHelper = Private(require('ui/kibi/directives/kibi_nav_bar_helper'));
        $httpBackend = _$httpBackend_;

        sinon.stub(kibiState, '_getDashboardsIdInConnectedComponent').returns(dashboardsIdsInConnectedComponents);
        sinon.stub(kibiState, '_getCurrentDashboardId').returns('dashboard1');

        kibiNavBarHelper.setChrome({
          getBasePath: () => ''
        });

        kibiNavBarHelper._setDashboardGroups(dashboardGroups);

        const dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));
        const stub = sinon.stub(dashboardGroupHelper, 'getCountQueryForSelectedDashboard');
        _.each(dashboardGroups, function (group, i) {
          const query = {
            query: group.query,
            indexPatternId: 'id',
            groupIndex: i
          };
          stub
          .withArgs(sinon.match.any, i)
          .returns(query);
        });
      });
    }

    describe('dashboards count', function () {
      beforeEach(() => init({
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: []
                }
              )
            }
          },
          {
            id: 'dashboard2',
            title: 'dashboard2',
            savedSearchId: 'search2',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index2',
                  filter: []
                }
              )
            }
          }
        ],
        dashboardGroups: [
          {
            id: 'group dashboard1',
            selected: {
              id: 'dashboard1'
            },
            query: true
          },
          {
            id: 'group dashboard2',
            selected: {
              id: 'dashboard2'
            },
            query: true
          }
        ]
      }));

      it('should update all counts', function (done) {
        const countOnTabsResponse = {
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

        $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ])
        .then((dashboardGroups) => {
          expect(dashboardGroups).to.have.length(2);
          expect(dashboardGroups[0].id).to.be('group dashboard1');
          expect(dashboardGroups[0].count).to.be(42);
          expect(dashboardGroups[1].id).to.be('group dashboard2');
          expect(dashboardGroups[1].count).to.be(24);
          done();
        }).catch(done);

        $rootScope.$digest();
        $timeout.flush();
        $rootScope.$digest();
        $httpBackend.flush();
      });

      it('should update count of one dashboard only', function (done) {
        const countOnTabsResponse = {
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        };

        $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        kibiNavBarHelper.updateAllCounts([ 'dashboard1' ])
        .then((dashboardGroups) => {
          expect(dashboardGroups).to.have.length(2);
          expect(dashboardGroups[0].id).to.be('group dashboard1');
          expect(dashboardGroups[0].count).to.be(42);
          expect(dashboardGroups[1].id).to.be('group dashboard2');
          expect(dashboardGroups[1].count).to.not.be.ok();
          done();
        }).catch(done);

        $rootScope.$digest();
        $timeout.flush();
        $rootScope.$digest();
        $httpBackend.flush();
      });

      it('should update counts of current dashboard on kibiState changes', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        [
          kibiState._properties.groups,
          kibiState._properties.enabled_relational_panel
        ].forEach(function (property) {
          kibiState.emit('save_with_changes', [ property ]);
          $rootScope.$digest();

          expect(stub.calledWith([ 'dashboard1' ], `KibiState change ${JSON.stringify([ property ], null, ' ')}`)).to.be(true);
        });
      });

      it('should update counts of dashboards that got changed on kibiState reset', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        kibiState.emit('reset', [ 'dashboard2' ]);
        $rootScope.$digest();

        expect(stub.calledWith([ 'dashboard2' ], 'KibiState reset')).to.be(true);
      });

      it('should update counts of dashboards that got changed on kibiState relation event', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        kibiState.emit('relation', [ 'dashboard2' ]);
        $rootScope.$digest();

        expect(stub.calledWith([ 'dashboard2' ], 'KibiState enabled relations changed')).to.be(true);
      });

      it('should update all counts on globalState filters changes', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        globalState.emit('save_with_changes', [ 'filters' ]);
        $rootScope.$digest();

        expect(stub.calledWith(null, 'GlobalState pinned filters change')).to.be(true);
      });

      it('should update all counts on globalState time refreshInterval changes', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        globalState.emit('save_with_changes', [ 'refreshInterval' ]);
        $rootScope.$digest();

        expect(stub.calledWith(null, 'GlobalState refreshInterval changed')).to.be(true);
      });

      it('should update count of current dashboard on globalState time change', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        globalState.emit('save_with_changes', [ 'time' ]);
        $rootScope.$digest();

        expect(stub.calledWith([ 'dashboard1' ], 'GlobalState time changed')).to.be(true);
      });
    });

    it('skip dashboard groups that do not have a query set', function (done) {
      var countOnTabsResponse = {
        responses: [
          {
            hits: {
              total: 42
            }
          }
        ]
      };

      init({
        dashboardGroups: [
          {
            id: 'group dashboard1',
            selected: {
              id: 'dashboard1'
            },
            query: true
          },
          {
            id: 'group dashboard2',
            selected: {
              id: 'dashboard2'
            }
          }
        ]
      });

      $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
      kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ])
      .then((dashboardGroups) => {
        expect(dashboardGroups).to.have.length(2);
        expect(dashboardGroups[0].id).to.be('group dashboard1');
        expect(dashboardGroups[0].count).to.be(42);
        expect(dashboardGroups[1].id).to.be('group dashboard2');
        expect(dashboardGroups[1].count).to.not.be.ok();
        done();
      }).catch(done);

      $rootScope.$digest();
      $timeout.flush();
      $rootScope.$digest();
      $httpBackend.flush();
    });

    describe('dashboards count with connected dashboards', function () {
      beforeEach(() => init({
        dashboardsIdsInConnectedComponents: [ 'dashboard1', 'dashboard2' ]
      }));

      it('should update counts of all dashboards on courier:searchRefresh', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        $rootScope.$broadcast('courier:searchRefresh');
        $rootScope.$digest();
        expect(stub.calledWith(null, 'courier:searchRefresh event', true)).to.be(true);
      });

      it('should update counts of current dashboard and those connected on kibiState changes', function () {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        [
          kibiState._properties.groups,
          kibiState._properties.enabled_relational_panel
        ].forEach(function (property) {
          kibiState.emit('save_with_changes', [ property ]);
          $rootScope.$digest();

          const actual = stub.calledWith([ 'dashboard1', 'dashboard2' ], `KibiState change ${JSON.stringify([ property ], null, ' ')}`);
          expect(actual).to.be(true);
        });
      });
    });
  });
});
