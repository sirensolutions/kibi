const expect = require('expect.js');
const ngMock = require('ngMock');
const MockState = require('fixtures/mock_state');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const sinon = require('auto-release-sinon');

var fakeSavedDashboards = [
  {
    id: 'Articles',
    title: 'Articles'
  },
  {
    id: 'Companies',
    title: 'Companies'
  },
  {
    id: 'time-testing-1',
    title: 'time testing 1',
    timeRestore: false
  },
  {
    id: 'time-testing-2',
    title: 'time testing 2',
    timeRestore: true,
    timeMode: 'quick',
    timeFrom: 'now-15y',
    timeTo: 'now'
  },
  {
    id: 'time-testing-3',
    title: 'time testing 3',
    timeRestore: true,
    timeMode: 'absolute',
    timeFrom: '2005-09-01T12:00:00.000Z',
    timeTo: '2015-09-05T12:00:00.000Z'
  }
];
var fakeSavedDashboardGroups = [
  {
    id: 'group-1',
    title: 'Group 1',
    priority: 1,
    dashboards: [
      {
        title: 'Companies',
        id: 'Companies'
      },
      {
        id: 'Articles',
        title: 'Articles'
      }
    ]
  },
  {
    id: 'group-2',
    title: 'Group 2',
    priority: 2,
    dashboards: []
  }
];
var fakeSavedDashboardsForCounts = [
  {
    id: 'Articles',
    title: 'Articles'
  },
  {
    id: 'search-ste',
    title: 'search-ste',
    savedSearchId: 'search-ste'
  },
  {
    id: 'time-testing-4',
    title: 'time-testing-4',
    timeRestore: true,
    timeFrom: '2005-09-01T12:00:00.000Z',
    timeTo: '2015-09-05T12:00:00.000Z',
    savedSearchId: 'time-testing-4'
  }
];
var fakeSavedSearches = [
  {
    id: 'search-ste',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'search-ste',
          filter: [],
          query: {}
        }
      )
    }
  },
  {
    id: 'time-testing-4',
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify(
        {
          index: 'time-testing-4', // here put this id to make sure fakeTimeFilter will supply the timfilter for it
          filter: [],
          query: {}
        }
      )
    }
  }
];

var dashboardGroupHelper;
var appState;

function init({ currentDashboardId = 'Articles', indexPatterns, savedDashboards, savedDashboardGroups, savedSearches }) {
  return function () {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kibiEnterpriseEnabled', false);
      $provide.constant('kbnDefaultAppId', 'dashboard');
      $provide.constant('kibiDefaultDashboardId', 'Articles');
      $provide.constant('elasticsearchPlugins', ['siren-join']);

      appState = new MockState({ filters: [] });
      $provide.service('getAppState', () => {
        return function () { return appState; };
      });
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboard', savedDashboards || []));
    });

    ngMock.module('kibana/index_patterns', function ($provide) {
      $provide.service('indexPatterns', (Promise) => mockSavedObjects(Promise)('indexPatterns', indexPatterns || []));
    });

    ngMock.module('dashboard_groups_editor/services/saved_dashboard_groups', function ($provide) {
      $provide.service('savedDashboardGroups', (Promise) => mockSavedObjects(Promise)('savedDashboardGroups', savedDashboardGroups || []));
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', savedSearches || []));
    });

    ngMock.inject(function ($injector, kibiState, Private) {
      dashboardGroupHelper = Private(require('ui/kibi/helpers/dashboard_group_helper'));
      sinon.stub(kibiState, '_getCurrentDashboardId').returns(currentDashboardId);
    });
  };
}

describe('Kibi Components', function () {
  describe('DashboardGroupHelper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    describe('Simple tests', function () {

      beforeEach(init({
        savedDashboards: fakeSavedDashboards,
        savedDashboardGroups: fakeSavedDashboardGroups,
        savedSearches: fakeSavedSearches
      }));

      it('shortenDashboardName should shorten', function () {
        expect(dashboardGroupHelper.shortenDashboardName('TEST', 'TEST dashboard')).to.be('dashboard');
        expect(dashboardGroupHelper.shortenDashboardName('TEST', 'TEST-dashboard')).to.be('dashboard');
      });

      it('shortenDashboardName should not shorten', function () {
        expect(dashboardGroupHelper.shortenDashboardName('BLA', 'TEST dashboard')).to.be('TEST dashboard');
        expect(dashboardGroupHelper.shortenDashboardName('BLA', 'TEST-dashboard')).to.be('TEST-dashboard');
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
        }).catch(done);
      });

      it('getIdsOfDashboardGroupsTheseDashboardsBelongTo - there is NOT a group with a dashboard', function (done) {
        var dashboardIds = ['ArticlesXXX'];

        dashboardGroupHelper.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds).then(function (groupIds) {
          expect(groupIds).to.eql([]);
          done();
        }).catch(done);
      });


    });

    describe('compute groups', function () {
      describe('on no dashboard', function () {
        beforeEach(init({
          currentDashboardId: '',
          savedDashboards: fakeSavedDashboards,
          savedDashboardGroups: fakeSavedDashboardGroups,
          savedSearches: fakeSavedSearches
        }));

        it('no current dashboard', function (done) {
          dashboardGroupHelper.computeGroups().then(function (groups) {
            // computeGroups should return all 5 groups, even when no dashboard is selected
            expect(groups).to.have.length(5);
            done();
          }).catch(done);
        });
      });

      describe('for the current dashboard Articles', function () {
        beforeEach(init({
          savedDashboards: fakeSavedDashboards,
          savedDashboardGroups: fakeSavedDashboardGroups,
          savedSearches: fakeSavedSearches
        }));

        it('computeGroups 1', function (done) {
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
          }).catch(done);
        });
      });

      describe('dashboards do not exist', function () {
        beforeEach(init({ savedDashboardGroups: fakeSavedDashboardGroups }));

        it('computeGroups 2', function (done) {
          dashboardGroupHelper.computeGroups()
          .then(() => done('this should fail'))
          .catch(function (err) {
            // here if there are groups but there is no dashboards we should get an error
            expect(err.message).to.be(
              '"Group 1" dashboard group contains non existing dashboard "Companies". Edit dashboard group to remove non existing dashboard'
            );
            done();
          });
        });
      });

      describe('no dashboards groups', function () {
        beforeEach(init({ savedDashboards: fakeSavedDashboards, savedSearches: fakeSavedSearches }));

        it('computeGroups 3', function (done) {
          dashboardGroupHelper.computeGroups().then(function (groups) {
            // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
            expect(groups).to.have.length(5);
            done();
          }).catch(done);
        });
      });

      describe('no dashboards groups, no dashboards', function () {
        beforeEach(init({ savedSearches: fakeSavedSearches }));

        it('computeGroups 4', function (done) {
          dashboardGroupHelper.computeGroups().then(function (groups) {
            // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
            expect(groups).to.have.length(0);
            done();
          }).catch(done);
        });
      });
    });

    describe('getCountQueryForSelectedDashboard', function () {

      beforeEach(init({
        indexPatterns: [
          {
            id: 'time-testing-4',
            timeFieldName: 'date',
            fields: [
              {
                name: 'date'
              }
            ]
          }
        ],
        savedDashboards: fakeSavedDashboardsForCounts,
        savedSearches: fakeSavedSearches
      }));

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
        }).catch(done);
      });

      it('selected dashboard exists but it does NOT have savedSearchId', function (done) {
        var groups = [
          {
            title: 'Title A0',
            dashboards: [{id: 1}, {id: 2}],
            selected: {id: 1}
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
        }).catch(done);
      });

      it('selected dashboard does exist and has an savedSearchId', function (done) {

        // this dashboard has to exist (the fakeDashboard should have it)
        var selectedDashboard = {id: 'time-testing-4', savedSearchId: 'time-testing-4'};
        var groups = [
          {
            title: 'Group 1',
            dashboards: [selectedDashboard, {id: 2}],
            selected: selectedDashboard
          }
        ];

        dashboardGroupHelper.getCountQueryForSelectedDashboard(groups, 0).then(function (countQueryDef) {
          expect(countQueryDef).to.have.property('query');
          expect(countQueryDef.indexPatternId).to.equal('time-testing-4');
          expect(countQueryDef.groupIndex).to.equal(0);
          done();
        }).catch(done);
      });

    });

  });

});
