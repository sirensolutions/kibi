const sinon = require('auto-release-sinon');
const ngMock = require('ngMock');
const expect = require('expect.js');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const _ = require('lodash');
const noDigestPromises = require('testUtils/noDigestPromises');
const poolUntil = require('./_pool_until');

let kibiState;
let globalState;
let kibiNavBarHelper;
let $rootScope;
let $httpBackend;
let $timeout;

let timeBasedIndicesStub;

describe('Kibi Directives', function () {
  describe('KibiNavBar Helper', function () {

    noDigestPromises.activateForSuite();

    function init({ dashboardsIdsInConnectedComponents = [], savedDashboards = [], dashboardGroups = [] }) {
      ngMock.module('kibana', ($provide) => {
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardId', '');
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
      });

      ngMock.module('app/discover', function ($provide) {
        $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', []));
      });

      ngMock.inject(function (Promise, _globalState_, _kibiState_, _$httpBackend_, _$timeout_, _$rootScope_, Private) {
        globalState = _globalState_;
        kibiState = _kibiState_;
        $timeout = _$timeout_;
        $rootScope = _$rootScope_;
        kibiNavBarHelper = Private(require('ui/kibi/directives/kibi_nav_bar_helper'));
        $httpBackend = _$httpBackend_;

        sinon.stub(kibiState, '_getDashboardsIdInConnectedComponent').returns(dashboardsIdsInConnectedComponents);
        sinon.stub(kibiState, '_getCurrentDashboardId').returns('dashboard1');
        timeBasedIndicesStub = sinon.stub(kibiState, 'timeBasedIndices').returns(Promise.resolve([ 'id' ]));

        kibiNavBarHelper.setChrome({
          getBasePath: () => ''
        });

        kibiNavBarHelper._setDashboardGroups(dashboardGroups);

        const dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));
        const stub = sinon.stub(dashboardGroupHelper, 'getCountQueryForSelectedDashboard');
        _.each(dashboardGroups, function (group, i) {
          const query = {
            dashboardId: 'dashboard1',
            query: group.query,
            indexPatternId: 'id',
            groupIndex: i
          };
          stub
          .withArgs(sinon.match.any, i)
          .returns(Promise.resolve(query));
        });
      });
    }

    describe('dashboards count and filter messages', function () {
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

      describe('should update filterIconMessage on selected dashboards', function () {

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

        it('there should be filterIconMessage just for first dashboard when filter is set on it', function (done) {
          var stab = sinon.stub(kibiState, 'getState');
          stab.withArgs('dashboard1').returns(Promise.resolve({
            queries: [],
            filters: [{dummyFilter: {}}]
          }));
          stab.withArgs('dashboard2').returns(Promise.resolve({
            queries: [],
            filters: []
          }));

          $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            $httpBackend.flush();
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            // watch dashboardGroups untill the counts are set
            poolUntil(
              function () {
                var poolRes = dashboardGroups.length === 2 && dashboardGroups[0].selected && dashboardGroups[1].selected &&
                dashboardGroups[0].selected.filterIconMessage !== undefined && dashboardGroups[1].selected.filterIconMessage !== undefined;
                return poolRes;
              }, 5000, 1,
              function (err) {
                if (err) {
                  done(err);
                }
                // now dashboardGroups are ready to inspect
                expect(timeBasedIndicesStub.called).to.be(true);
                expect(dashboardGroups).to.have.length(2);
                expect(dashboardGroups[0].id).to.be('group dashboard1');
                expect(dashboardGroups[0].selected.filterIconMessage).to.be('This dashboard has 1 filter set.');
                expect(dashboardGroups[1].id).to.be('group dashboard2');
                expect(dashboardGroups[1].selected.filterIconMessage).to.be(null);
                done();
              }
            );
          }, 950); // more than default delay of 750 for dashboards count queries
        });

        it('there should be filterIconMessage just for first dashboard when 2 filters are set on it', function (done) {
          var stab = sinon.stub(kibiState, 'getState');
          stab.withArgs('dashboard1').returns(Promise.resolve({
            queries: [],
            filters: [{dummyFilter1: {}}, {dummyFilter2: {}}]
          }));
          stab.withArgs('dashboard2').returns(Promise.resolve({
            queries: [],
            filters: []
          }));

          $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            $httpBackend.flush();
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            // watch dashboardGroups untill the counts are set
            poolUntil(
              function () {
                var poolRes = dashboardGroups.length === 2 && dashboardGroups[0].selected && dashboardGroups[1].selected &&
                dashboardGroups[0].selected.filterIconMessage !== undefined && dashboardGroups[1].selected.filterIconMessage !== undefined;
                return poolRes;
              }, 5000, 1,
              function (err) {
                if (err) {
                  done(err);
                }
                // now dashboardGroups are ready to inspect
                expect(timeBasedIndicesStub.called).to.be(true);
                expect(dashboardGroups).to.have.length(2);
                expect(dashboardGroups[0].id).to.be('group dashboard1');
                expect(dashboardGroups[0].selected.filterIconMessage).to.be('This dashboard has 2 filters set.');
                expect(dashboardGroups[1].id).to.be('group dashboard2');
                expect(dashboardGroups[1].selected.filterIconMessage).to.be(null);
                done();
              }
            );
          }, 950); // more than default delay of 750 for dashboards count queries
        });

        it('there should be filterIconMessage just for first dashboard when there are two queries for it', function (done) {
          var stab = sinon.stub(kibiState, 'getState');
          stab.withArgs('dashboard1').returns(Promise.resolve({
            queries: [{query: 'saved_with_dash'}, {query: 'set_on_search_bar'}],
            filters: []
          }));
          stab.withArgs('dashboard2').returns(Promise.resolve({
            queries: [],
            filters: []
          }));

          $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            $httpBackend.flush();
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            // watch dashboardGroups untill the counts are set
            poolUntil(
              function () {
                var poolRes = dashboardGroups.length === 2 && dashboardGroups[0].selected && dashboardGroups[1].selected &&
                dashboardGroups[0].selected.filterIconMessage !== undefined && dashboardGroups[1].selected.filterIconMessage !== undefined;
                return poolRes;
              }, 5000, 1,
              function (err) {
                if (err) {
                  done(err);
                }
                // now dashboardGroups are ready to inspect
                expect(timeBasedIndicesStub.called).to.be(true);
                expect(dashboardGroups).to.have.length(2);
                expect(dashboardGroups[0].id).to.be('group dashboard1');
                expect(dashboardGroups[0].selected.filterIconMessage).to.be('This dashboard has a query set.');
                expect(dashboardGroups[1].id).to.be('group dashboard2');
                expect(dashboardGroups[1].selected.filterIconMessage).to.be(null);
                done();
              }
            );
          }, 950); // more than default delay of 750 for dashboards count queries
        });

        it('there should be filterIconMessage just for first dashboard when there are two queries and a filter', function (done) {
          var stab = sinon.stub(kibiState, 'getState');
          stab.withArgs('dashboard1').returns(Promise.resolve({
            queries: [{query: 'saved_with_dash'}, {query: 'set_on_search_bar'}],
            filters: [{filter: 'set_on_filter_bar'}]
          }));
          stab.withArgs('dashboard2').returns(Promise.resolve({
            queries: [],
            filters: []
          }));

          $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            $httpBackend.flush();
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            // watch dashboardGroups untill the counts are set
            poolUntil(
              function () {
                var poolRes = dashboardGroups.length === 2 && dashboardGroups[0].selected && dashboardGroups[1].selected &&
                dashboardGroups[0].selected.filterIconMessage !== undefined && dashboardGroups[1].selected.filterIconMessage !== undefined;
                return poolRes;
              }, 5000, 1,
              function (err) {
                if (err) {
                  done(err);
                }
                // now dashboardGroups are ready to inspect
                expect(timeBasedIndicesStub.called).to.be(true);
                expect(dashboardGroups).to.have.length(2);
                expect(dashboardGroups[0].id).to.be('group dashboard1');
                expect(dashboardGroups[0].selected.filterIconMessage).to.be('This dashboard has a query and 1 filter set.');
                expect(dashboardGroups[1].id).to.be('group dashboard2');
                expect(dashboardGroups[1].selected.filterIconMessage).to.be(null);
                done();
              }
            );
          }, 950); // more than default delay of 750 for dashboards count queries
        });
      });

      describe('should update counts on selected dashboards', function () {

        before(noDigestPromises.deactivate);

        it('for all dashboards', function (done) {
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
          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            $httpBackend.flush();
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;
            expect(timeBasedIndicesStub.called).to.be(true);
            expect(dashboardGroups).to.have.length(2);
            expect(dashboardGroups[0].id).to.be('group dashboard1');
            expect(dashboardGroups[0].selected.count).to.be(42);
            expect(dashboardGroups[1].id).to.be('group dashboard2');
            expect(dashboardGroups[1].selected.count).to.be(24);
            done();
          }, 950); // more than default delay of 750 for dashboards count queries
        });

        it('for one dashboard', function (done) {
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
          kibiNavBarHelper.updateAllCounts([ 'dashboard1' ]);

          setTimeout(function () {
            $httpBackend.flush();
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;
            expect(timeBasedIndicesStub.called).to.be(true);
            expect(dashboardGroups).to.have.length(2);
            expect(dashboardGroups[0].id).to.be('group dashboard1');
            expect(dashboardGroups[0].selected.count).to.be(42);
            expect(dashboardGroups[1].id).to.be('group dashboard2');
            expect(dashboardGroups[1].selected.count).to.not.be.ok();
            done();
          }, 950); // more than default delay of 750 for dashboards count queries
        });

        after(noDigestPromises.deactivate);
      });

      it('should update counts of current dashboard on kibiState changes', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        var counter = 0;
        kibiState.on('save_with_changes', function (diff) {
          counter++;
          if (diff[0] === 'g') {
            expect(stub.calledWith([ 'dashboard1' ], `KibiState change ${JSON.stringify([ 'g' ], null, ' ')}`)).to.be(true);
          }
          if (diff[0] === 'e') {
            expect(stub.calledWith([ 'dashboard1' ], `KibiState change ${JSON.stringify([ 'e' ], null, ' ')}`)).to.be(true);
          }
          if (counter === 2) {
            done();
          }
        });

        [
          kibiState._properties.groups,
          kibiState._properties.enabled_relational_panel
        ].forEach(function (property) {
          kibiState.emit('save_with_changes', [ property ]);
        });
      });

      it('should update counts of dashboards that got changed on kibiState reset', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        kibiState.on('reset', function (diff) {
          if (diff[0] === 'dashboard2') {
            expect(stub.calledWith([ 'dashboard2' ], 'KibiState reset')).to.be(true);
            done();
          }
        });

        kibiState.emit('reset', [ 'dashboard2' ]);
      });

      it('should update the count of dashboard that got changed on kibiState time event', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        kibiState.on('time', function (dashboardId) {
          expect(stub.calledWith([ 'dashboard2' ], 'KibiState time changed on dashboard dashboard2')).to.be(true);
          done();
        });

        kibiState.emit('time', 'dashboard2');
      });

      it('should update counts of dashboards that got changed on kibiState relation event', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        kibiState.on('relation', function (diff) {
          if (diff[0] === 'dashboard2') {
            expect(stub.calledWith([ 'dashboard2' ], 'KibiState enabled relations changed')).to.be(true);
            done();
          }
        });

        kibiState.emit('relation', [ 'dashboard2' ]);
      });

      it('should update all counts on globalState filters changes', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        globalState.on('save_with_changes', function (diff) {
          if (diff[0] === 'filters') {
            expect(stub.calledWith(null, 'GlobalState pinned filters change')).to.be(true);
            done();
          }
        });

        globalState.emit('save_with_changes', [ 'filters' ]);
      });

      it('should update all counts on globalState time refreshInterval changes', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        globalState.on('save_with_changes', function (diff) {
          if (diff[0] === 'refreshInterval') {
            expect(stub.calledWith(null, 'GlobalState refreshInterval changed')).to.be(true);
            done();
          }
        });

        globalState.emit('save_with_changes', [ 'refreshInterval' ]);
      });

      it('should update count of current dashboard on globalState time change', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        globalState.on('save_with_changes', function (diff) {
          if (diff[0] === 'time') {
            expect(stub.calledWith([ 'dashboard1' ], 'GlobalState time changed')).to.be(true);
            done();
          }
        });

        globalState.emit('save_with_changes', [ 'time' ]);
      });
    });

    describe('groups with no queries', function () {
      before(noDigestPromises.deactivate);

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
            }, {
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
              }
            }
          ]
        });

        $httpBackend.whenPOST('/elasticsearch/_msearch?getCountsOnTabs').respond(200, countOnTabsResponse);
        kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

        setTimeout(function () {
          $httpBackend.flush();
          var dashboardGroups = kibiNavBarHelper.dashboardGroups;
          expect(timeBasedIndicesStub.called).to.be(true);
          expect(dashboardGroups).to.have.length(2);
          expect(dashboardGroups[0].id).to.be('group dashboard1');
          expect(dashboardGroups[0].selected.count).to.be(42);
          expect(dashboardGroups[1].id).to.be('group dashboard2');
          expect(dashboardGroups[1].selected.count).to.not.be.ok();
          done();
        }, 950); // more than default delay of 750 for dashboards count queries
      });

      after(noDigestPromises.activate);
    });


    describe('dashboards count with connected dashboards', function () {
      beforeEach(() => init({
        dashboardsIdsInConnectedComponents: [ 'dashboard1', 'dashboard2' ]
      }));

      it('should update counts of all dashboards on courier:searchRefresh', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        $rootScope.$broadcast('courier:searchRefresh');
        expect(stub.calledWith(null, 'courier:searchRefresh event', true)).to.be(true);
        done();
      });

      it('should update the count of dashboard that got changed on kibiState time event and those connected', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        kibiState.on('time', function (dashboardId) {
          expect(stub.calledWith([ 'dashboard1', 'dashboard2' ], 'KibiState time changed on dashboard dashboard2')).to.be(true);
          done();
        });

        kibiState.emit('time', 'dashboard2');
      });

      it('should update counts of current dashboard and those connected on kibiState changes', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');

        var counter = 0;
        kibiState.on('save_with_changes', function (diff) {
          counter++;
          if (diff[0] === 'g') {
            const actual = stub.calledWith([ 'dashboard1', 'dashboard2' ], `KibiState change ${JSON.stringify(['g'], null, ' ')}`);
            expect(actual).to.be(true);
          }
          if (diff[0] === 'e') {
            const actual = stub.calledWith([ 'dashboard1', 'dashboard2' ], `KibiState change ${JSON.stringify(['e'], null, ' ')}`);
            expect(actual).to.be(true);
          }
          if (counter === 2) {
            done();
          }
        });

        [
          kibiState._properties.groups,
          kibiState._properties.enabled_relational_panel
        ].forEach(function (property) {
          kibiState.emit('save_with_changes', [ property ]);
        });
      });
    });

  });

});
