const sinon = require('auto-release-sinon');
const ngMock = require('ngMock');
const expect = require('expect.js');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const _ = require('lodash');
const noDigestPromises = require('testUtils/noDigestPromises');
const pollUntil = require('./_poll_until');
const chrome = require('ui/chrome');

let kibiState;
let globalState;
let kibiNavBarHelper;
let $rootScope;
let $httpBackend;
let $timeout;

let timeBasedIndicesStub;
let getDashboardsMetadataStub;

describe('Kibi Directives', function () {
  describe('KibiNavBar Helper', function () {

    noDigestPromises.activateForSuite();

    function getDefaultQuery() {
      return {
        query: {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        }
      };
    }

    function init({ dashboardsIdsInConnectedComponents = [], savedDashboards = [], dashboardGroups = [] }) {
      ngMock.module('kibana', ($provide) => {
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardTitle', '');
        $provide.constant('elasticsearchPlugins', ['siren-join']);
      });

      ngMock.module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboards', savedDashboards));
      });

      ngMock.module('app/discover', function ($provide) {
        $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', []));
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

        sinon.stub(chrome, 'getBasePath').returns('');
        sinon.stub(chrome, 'getActiveTabId').returns('dashboard');

        kibiNavBarHelper._setDashboardGroups(dashboardGroups);

        const dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));
        getDashboardsMetadataStub = sinon.stub(dashboardGroupHelper, 'getDashboardsMetadata');
      });
    }

    describe('remove dashboards properties (count, isPruned, filterIconMessage)', function () {

      beforeEach(() => {
        var dash1 = {
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
          },
          count: 789,
          isPruned: true,
          filterIconMessage: 'there is so many filters :('
        };
        var dash2 = {
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
          },
          count: 123,
          isPruned: false,
          filterIconMessage: 'there is 1 filter'
        };

        init({
          savedDashboards: [dash1, dash2],
          dashboardGroups: [
            {
              id: 'group dashboard1',
              selected: dash1,
              dashboards: [dash1]
            },
            {
              id: 'group dashboard2',
              selected: dash2,
              dashboards: [dash2]
            }
          ]
        });
      });


      it('should set count, isPruned and filterIconMessage to undefined if there is no metadata for the requested dashboard',
        function (done) {
          // return meta only for second dashboard
          getDashboardsMetadataStub.returns(Promise.resolve([
            {
              dashboardId: 'dashboard2',
              count: 24,
              queries: [ getDefaultQuery() ],
              filters: [{}],
              isPruned: true
            }
          ]));

          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            expect(dashboardGroups).to.have.length(2);
            expect(dashboardGroups[0].id).to.be('group dashboard1');
            expect(dashboardGroups[0].selected.count).to.not.be.ok();
            expect(dashboardGroups[0].selected.filterIconMessage).to.not.be.ok();
            expect(dashboardGroups[0].selected.isPruned).to.not.be.ok();
            expect(dashboardGroups[1].id).to.be('group dashboard2');
            expect(dashboardGroups[1].selected.count).to.equal(24);
            expect(dashboardGroups[1].selected.isPruned).to.equal(true);
            expect(dashboardGroups[1].selected.filterIconMessage).to.equal('This dashboard has 1 filter set.');
            done();
          }, 950); // more than default delay of 750 for dashboards count queries
        });
    });

    describe('set dashboards properties (count, isPruned, filterIconMessage)', function () {
      beforeEach(() => {
        var dash1 = {
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
        };
        var dash2 = {
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
        };

        init({
          savedDashboards: [dash1, dash2],
          dashboardGroups: [
            {
              id: 'group dashboard1',
              selected: dash1,
              dashboards: [dash1]
            },
            {
              id: 'group dashboard2',
              selected: dash2,
              dashboards: [dash2]
            }
          ]
        });
      });

      describe('should update filterIconMessage on selected dashboards', function () {

        it('there should be filterIconMessage just for first dashboard when filter is set on it', function (done) {
          getDashboardsMetadataStub.returns(Promise.resolve([
            {
              dashboardId: 'dashboard1',
              count: 42,
              queries: [ getDefaultQuery() ],
              filters: [{dummyFilter: {}}],
              isPruned: false
            },
            {
              dashboardId: 'dashboard2',
              count: 24,
              queries: [ getDefaultQuery() ],
              filters: [],
              isPruned: false
            }
          ]));

          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;
            // watch dashboardGroups until the filterIconMessage is set on selected
            pollUntil(
              function () {
                var poolRes = dashboardGroups.length === 2 && dashboardGroups[0].selected && dashboardGroups[1].selected &&
                dashboardGroups[0].selected.filterIconMessage !== undefined && dashboardGroups[1].selected.filterIconMessage !== undefined;
                return poolRes;
              }, 5000, 1,
              function (err) {
                if (err) {
                  return done(err);
                }
                // now dashboardGroups are ready to inspect
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
          getDashboardsMetadataStub.returns(Promise.resolve([
            {
              dashboardId: 'dashboard1',
              count: 42,
              queries: [ getDefaultQuery() ],
              filters: [{dummyFilter1: {}}, {dummyFilter2: {}}],
              isPruned: false
            },
            {
              dashboardId: 'dashboard2',
              count: 24,
              queries: [ getDefaultQuery() ],
              filters: [],
              isPruned: false
            }
          ]));

          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            // watch dashboardGroups until the filterIconMessage is set on selected
            pollUntil(
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
          getDashboardsMetadataStub.returns(Promise.resolve([
            {
              dashboardId: 'dashboard1',
              count: 42,
              queries: [{query: 'saved_with_dash'}, {query: 'set_on_search_bar'}],
              filters: [],
              isPruned: false
            },
            {
              dashboardId: 'dashboard2',
              count: 24,
              queries: [ getDefaultQuery() ],
              filters: [],
              isPruned: false
            }
          ]));

          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            // watch dashboardGroups until the filterIconMessage is set on selected
            pollUntil(
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
          getDashboardsMetadataStub.returns(Promise.resolve([
            {
              dashboardId: 'dashboard1',
              count: 42,
              queries: [{query: 'saved_with_dash'}, {query: 'set_on_search_bar'}],
              filters: [{filter: 'set_on_filter_bar'}],
              isPruned: false
            },
            {
              dashboardId: 'dashboard2',
              count: 24,
              queries: [ getDefaultQuery() ],
              filters: [],
              isPruned: false
            }
          ]));

          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;

            // watch dashboardGroups until the filterIconMessage is set on selected
            pollUntil(
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

        it('for all dashboards', function (done) {
          getDashboardsMetadataStub.returns(Promise.resolve([
            {
              dashboardId: 'dashboard1',
              count: 42,
              queries: [ getDefaultQuery() ],
              filters: [],
              isPruned: false
            },
            {
              dashboardId: 'dashboard2',
              count: 24,
              queries: [ getDefaultQuery() ],
              filters: [],
              isPruned: false
            }
          ]));

          kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

          setTimeout(function () {
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;
            expect(dashboardGroups).to.have.length(2);
            expect(dashboardGroups[0].id).to.be('group dashboard1');
            expect(dashboardGroups[0].selected.count).to.be(42);
            expect(dashboardGroups[1].id).to.be('group dashboard2');
            expect(dashboardGroups[1].selected.count).to.be(24);
            done();
          }, 950); // more than default delay of 750 for dashboards count queries
        });

        it('for one dashboard', function (done) {
          getDashboardsMetadataStub.returns(Promise.resolve([
            {
              dashboardId: 'dashboard1',
              count: 42,
              queries: [ getDefaultQuery() ],
              filters: [],
              isPruned: false
            }
          ]));

          kibiNavBarHelper.updateAllCounts([ 'dashboard1' ]);

          setTimeout(function () {
            var dashboardGroups = kibiNavBarHelper.dashboardGroups;
            expect(dashboardGroups).to.have.length(2);
            expect(dashboardGroups[0].id).to.be('group dashboard1');
            expect(dashboardGroups[0].selected.count).to.be(42);
            expect(dashboardGroups[1].id).to.be('group dashboard2');
            expect(dashboardGroups[1].selected.count).to.not.be.ok();
            done();
          }, 950); // more than default delay of 750 for dashboards count queries
        });
      });

      it('should update counts of current dashboard on kibiState changes', function (done) {
        const stub = sinon.stub(kibiNavBarHelper, 'updateAllCounts');
        var counter = 0;
        kibiState.on('save_with_changes', function (diff) {
          counter++;
          if (diff[0] === kibiState._properties.groups) {
            expect(stub.calledWith([ 'dashboard1' ], `KibiState change ${JSON.stringify([ 'g' ], null, ' ')}`)).to.be(true);
          }
          if (diff[0] === kibiState._properties.enabled_relational_panel) {
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

    describe('groups with no queries and unvisible dashboards', function () {

      beforeEach(function () {
        var dash1 = {
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
        };
        var dash2 = {
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
        };
        var dash3 = {
          id: 'invisibledashboard3',
          title: 'dashboard3',
          savedSearchId: 'search3',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify(
              {
                index: 'index3',
                filter: []
              }
            )
          }
        };

        var dash4 = {
          id: 'invisibledashboard4',
          title: 'dashboard4',
          savedSearchId: 'search4',
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify(
              {
                index: 'index4',
                filter: []
              }
            )
          }
        };

        init({
          savedDashboards: [dash1, dash2],
          dashboardGroups: [
            {
              id: 'group odd dashboards',
              selected: dash1,
              dashboards: [dash1, dash3]
            },
            {
              id: 'group even dashboards',
              selected: dash2,
              dashboards: [dash2, dash4]
            }
          ]
        });
      });

      it('do not update count on a dashboard if it is not returned from elastic', function (done) {

        getDashboardsMetadataStub.returns(Promise.resolve([
          {
            dashboardId: 'dashboard1',
            count: 42,
            queries: [ getDefaultQuery() ],
            filters: [],
            isPruned: false
          }
        ]));

        kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2' ]);

        setTimeout(function () {
          var dashboardGroups = kibiNavBarHelper.dashboardGroups;
          expect(dashboardGroups).to.have.length(2);
          expect(dashboardGroups[0].id).to.be('group odd dashboards');
          expect(dashboardGroups[0].selected.count).to.be(42);
          expect(dashboardGroups[1].id).to.be('group even dashboards');
          expect(dashboardGroups[1].selected.count).to.not.be.ok();
          done();
        }, 950); // more than default delay of 750 for dashboards count queries
      });

      it('update counts only on visible dashboards', function (done) {

        // not important as in this tests we will not test the count values
        // but we have to define that it returns somenthig to avoid undefined error
        getDashboardsMetadataStub.returns(Promise.resolve([]));

        kibiNavBarHelper.updateAllCounts([ 'dashboard1', 'dashboard2', 'dashboard3', 'dashboard4' ]);

        setTimeout(function () {
          getDashboardsMetadataStub.calledWith(['dashboard1', 'dashboard2']);
          done();
        }, 950); // more than default delay of 750 for dashboards count queries
      });
    });


    describe('dashboards count with connected dashboards', function () {
      beforeEach(() => init({
        dashboardsIdsInConnectedComponents: [ 'dashboard1', 'dashboard2' ]
      }));

      it('should update the counts of current dashboard plus connected dashboards on courier:searchRefresh', function (done) {
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
