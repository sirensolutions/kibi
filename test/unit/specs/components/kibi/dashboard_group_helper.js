define(function (require) {

  var fakeSavedDashboards           = require('fixtures/saved_dashboards');
  var fakeEmptySavedDashboards      = require('fixtures/empty_saved_dashboards');
  var fakeSavedDashboardGroups      = require('fixtures/fake_saved_dashboard_groups');
  var fakeEmptySavedDashboardGroups = require('fixtures/fake_empty_saved_dashboard_groups');


  var fake_saved_dashboards_for_counts = require('fixtures/fake_saved_dashboards_for_counts');
  var fakeSavedSearches                = require('fixtures/fake_saved_searches');

  var $rootScope;
  var dashboardGroupHelper;
  var kibiStateHelper;

  function init(savedDashboardsImpl, savedDashboardGroupsImpl, savedSearchesImpl) {
    return function () {

      module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', savedDashboardsImpl);
      });

      module('dashboard_groups_editor/services/saved_dashboard_groups', function ($provide) {
        $provide.service('savedDashboardGroups', savedDashboardGroupsImpl);
      });

      if (savedSearchesImpl) {
        module('kibana', function ($provide) {
          $provide.service('savedSearches', savedSearchesImpl);
        });
      } else {
        module('kibana');
      }


      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        dashboardGroupHelper = Private(require('components/kibi/dashboard_group_helper/dashboard_group_helper'));
        kibiStateHelper = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    describe('DashboardGroupHelper', function () {
      describe('Simpe tests', function () {

        beforeEach(init(fakeSavedDashboards, fakeSavedDashboardGroups));

        it('shortenDashboardName should shorten', function () {
          expect( dashboardGroupHelper.shortenDashboardName('TEST', 'TEST dashboard') ).to.be('dashboard');
          expect( dashboardGroupHelper.shortenDashboardName('TEST', 'TEST-dashboard') ).to.be('dashboard');
        });

        it('shortenDashboardName should not shorten', function () {
          expect( dashboardGroupHelper.shortenDashboardName('BLA', 'TEST dashboard') ).to.be('TEST dashboard');
          expect( dashboardGroupHelper.shortenDashboardName('BLA', 'TEST-dashboard') ).to.be('TEST-dashboard');
        });

        it('_getListOfDashboardsFromGroups', function () {
          var dA = {id: 'A'};
          var dB = {id: 'B'};
          var dC = {id: 'C'};
          var groups = [
            {
              dashboards: [dA, dB]
            },
            {
              dashboards: [dA, dB, dC]
            }
          ];

          var actual = dashboardGroupHelper._getListOfDashboardsFromGroups(groups);
          expect(actual.length).to.be(3);
          expect(actual[0]).to.be(dA);
          expect(actual[1]).to.be(dB);
          expect(actual[2]).to.be(dC);
        });

        it('getIdsOfDashboardGroupsTheseDashboardsBelongTo - there is a group with a dashboard', function (done) {
          var dashboardIds = ['Articles'];
          var expected = ['group-1'];

          dashboardGroupHelper.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds).then(function (groupIds) {
            expect(groupIds).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });


        it('getIdsOfDashboardGroupsTheseDashboardsBelongTo - there is NOT a group with a dashboard', function (done) {
          var dashboardIds = ['ArticlesXXX'];

          dashboardGroupHelper.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds).then(function (groupIds) {
            expect(groupIds).to.eql([]);
            done();
          });

          $rootScope.$apply();
        });

        it('computeGroups 1', function (done) {
          var expected = [];
          dashboardGroupHelper.computeGroups().then(function (groups) {

            expect(groups).to.have.length(5);

            expect(groups[0].title).to.equal('Group 1');
            expect(groups[0].dashboards).to.have.length(2);
            expect(groups[0].dashboards[0].id).to.match(/^Companies|Articles$/);
            expect(groups[0].dashboards[1].id).to.match(/^Companies|Articles$/);

            expect(groups[1].title).to.equal('Group 2');
            expect(groups[1].dashboards).to.have.length(0);

            expect(groups[2].title).to.equal('time testing 1');
            expect(groups[2].dashboards).to.have.length(1);
            expect(groups[2].dashboards[0].id).to.equal('time-testing-1');
            expect(groups[2].dashboards[0].title).to.equal('time testing 1');

            expect(groups[3].title).to.equal('time testing 2');
            expect(groups[3].dashboards).to.have.length(1);
            expect(groups[3].dashboards[0].id).to.equal('time-testing-2');
            expect(groups[3].dashboards[0].title).to.equal('time testing 2');

            expect(groups[4].title).to.equal('time testing 3');
            expect(groups[4].dashboards).to.have.length(1);
            expect(groups[4].dashboards[0].id).to.equal('time-testing-3');
            expect(groups[4].dashboards[0].title).to.equal('time testing 3');

            done();
          });

          $rootScope.$apply();
        });


      });

      describe('no dashboards', function () {
        beforeEach(init(fakeEmptySavedDashboards, fakeSavedDashboardGroups));

        it('computeGroups 2', function (done) {
          var expected = [];
          dashboardGroupHelper.computeGroups().then(function (groups) {
            // here if there are groups but there is no dashboards we should still get the groups
            expect(groups).to.have.length(2);
            done();
          });

          $rootScope.$apply();
        });
      });

      describe('no dashboards groups', function () {
        beforeEach(init(fakeSavedDashboards, fakeEmptySavedDashboardGroups));

        it('computeGroups 3', function (done) {
          var expected = [];
          dashboardGroupHelper.computeGroups().then(function (groups) {
            // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
            expect(groups).to.have.length(5);
            done();
          });

          $rootScope.$apply();
        });
      });

      describe('no dashboards groups, no dashboards', function () {
        beforeEach(init(fakeEmptySavedDashboards, fakeEmptySavedDashboardGroups));

        it('computeGroups 4', function (done) {
          var expected = [];
          dashboardGroupHelper.computeGroups().then(function (groups) {
            // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
            expect(groups).to.have.length(0);
            done();
          });

          $rootScope.$apply();
        });
      });


      describe('updateDashboardGroups', function () {
        beforeEach(init(fakeEmptySavedDashboards, fakeEmptySavedDashboardGroups));

        describe('when there is a delta on group level', function () {

          it('different dashboard group titles - group 0', function () {
            var oldDashboardGroups = [{
              title: 'Title A'
            }];
            var newDashboardGroups = [{
              title: 'Title B'
            }];

            var expected = {
              indexes: [0],
              reasons: ['different titles for group 0']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

          it('different dashboard group titles - group 1', function () {
            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [],
                _selected: {},
                selected: {}
              },
              {
                title: 'Title A1',
                dashboards: [],
                _selected: {},
                selected: {}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [],
                _selected: {},
                selected: {}
              },
              {
                title: 'Title B1',
                dashboards: [],
                _selected: {},
                selected: {}
              }
            ];

            var expected = {
              indexes: [1],
              reasons: ['different titles for group 1']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

          it('different number of dashboards in a group 0', function () {
            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{}, {}],
                _selected: {},
                selected: {}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{}],
                _selected: {},
                selected: {}
              }
            ];

            var expected = {
              indexes: [0],
              reasons: ['different number of dashboards for group 0']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

          it('different dashboard is _selected', function () {
            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1}, {id: 2}],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1}, {id: 2}],
                selected: {id: 1},
                _selected: {id: 2}
              }
            ];

            var expected = {
              indexes: [0],
              reasons: ['different selected dashboard for group 0']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

        });

        describe('when there is delta on in single dashboard level', function () {

          it('different number of filters for selected dashboard', function () {

            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1, filters: [{}, {}] }],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1, filters: [{}] }],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];

            var expected = {
              indexes: [0],
              reasons: ['different number of filters for dashboard 0 for group 0']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

          it('different indexPatternId for selected dashboard', function () {

            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1, indexPatternId: 'indexA'}],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1, indexPatternId: 'indexB'}],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];

            var expected = {
              indexes: [0],
              reasons: ['different indexPatternId for dashboard 0 for group 0']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

          it('different savedSearchId for selected dashboard', function () {

            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1, savedSearchId: 'savedSearchA'}],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1, savedSearchId: 'savedSearchB'}],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];

            var expected = {
              indexes: [0],
              reasons: ['different savedSearchId for dashboard 0 for group 0']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

          it('different dashboard ids for dashboards on the same positions', function () {

            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 1}, {id: 2}],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{id: 2}, {id: 1}],
                selected: {id: 1},
                _selected: {id: 1}
              }
            ];

            var expected = {
              indexes: [0],
              reasons: ['different dashboard id for dashboard 0 for group 0', 'different dashboard id for dashboard 1 for group 0']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

        });

        describe('when there is joinFilter on the dashboard update all counts', function () {
          //TODO: later we can analyze which dashboardGroups should be
          // updated but for now just update all
          it('different number of filters for selected dashboard', function () {

            var oldDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{ id: 1, filters: [ {join_set:{}} ] }],
                selected: {id: 1},
                _selected: {id: 1}
              },
              {
                title: 'Title B0',
                dashboards: [{ id: 2, filters: [] }],
                selected: {id: 2},
                _selected: {id: 2}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{ id: 1, filters: [ {join_set:{}} ] }],
                selected: {id: 1},
                _selected: {id: 1}
              },
              {
                title: 'Title B0',
                dashboards: [{id: 2, filters: [] }],
                selected: {id: 2},
                _selected: {id: 2}
              }
            ];

            var expected = {
              indexes: [0, 1],
              reasons: ['There is a join_set filter so lets update all groups']
            };

            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });

          it('should update counts if the kibi state has a join_set that is not yet in the app state', function () {

            var oldDashboardGroups = [
              {
                id: 'd0',
                title: 'Title A0',
                dashboards: [{ id: 1, filters: [] }],
                selected: {id: 1},
                _selected: {id: 1}
              },
              {
                id: 'd1',
                title: 'Title B0',
                dashboards: [{ id: 2, filters: [] }],
                selected: {id: 2},
                _selected: {id: 2}
              }
            ];
            var newDashboardGroups = [
              {
                title: 'Title A0',
                dashboards: [{ id: 1, filters: [] }],
                selected: {id: 1},
                _selected: {id: 1}
              },
              {
                title: 'Title B0',
                dashboards: [{id: 2, filters: [] }],
                selected: {id: 2},
                _selected: {id: 2}
              }
            ];

            var expected = {
              indexes: [0, 1],
              reasons: ['There is a join_set filter so lets update all groups']
            };

            kibiStateHelper.saveFiltersForDashboardId(1, [ { join_set: {} } ]);
            var actual = dashboardGroupHelper.updateDashboardGroups(oldDashboardGroups, newDashboardGroups);
            expect(actual).to.eql(expected);
          });
        });

      });

      describe('getCountQueryForSelectedDashboard', function () {

        beforeEach(init(fake_saved_dashboards_for_counts, fakeEmptySavedDashboardGroups, fakeSavedSearches));

        it('selected dashboard does NOT exist', function (done) {
          var groups = [
            {
              title: 'Title A0',
              dashboards: [{id: 1}]
            }
          ];

          var expected = {
            query: undefined,
            indexPatternId: undefined,
            groupIndex: 0
          };

          dashboardGroupHelper.getCountQueryForSelectedDashboard(groups, 0).then(function (countQueryDef) {
            expect(countQueryDef).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('selected dashboard exists but it does NOT have indexPatternId ', function (done) {
          var groups = [
            {
              title: 'Title A0',
              dashboards: [{id: 1}, {id: 2}],
              selected: {id: 1},
              _selected: {id: 1}
            }
          ];

          var expected = {
            query: undefined,
            indexPatternId: undefined,
            groupIndex: 0
          };

          dashboardGroupHelper.getCountQueryForSelectedDashboard(groups, 0).then(function (countQueryDef) {
            expect(countQueryDef).to.eql(expected);
            done();
          });

          $rootScope.$apply();
        });

        it('selected dashboard do exist and have indexPatternId ', function (done) {

          // this dashboard has to exist (the fakeDashboard should have it)
          var selectedDashboard = {id: 'time-testing-4', indexPatternId: 'time-testing-4'};
          var groups = [
            {
              title: 'Group 1',
              dashboards: [selectedDashboard, {id: 2}],
              selected: selectedDashboard,
              _selected: selectedDashboard
            }
          ];

          dashboardGroupHelper.getCountQueryForSelectedDashboard(groups, 0).then(function (countQueryDef) {
            expect(countQueryDef).to.have.property('query');
            expect(countQueryDef.indexPatternId).to.equal('time-testing-4');
            expect(countQueryDef.groupIndex).to.equal(0);
            done();
          }).catch(function (err) {
            expect().fail('Should not fail');
          });

          $rootScope.$apply();
        });


      });

    });

  });
});
