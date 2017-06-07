import Notifier from 'ui/notify/notifier';
import DashboardHelperProvider from 'ui/kibi/helpers/dashboard_helper';
import noDigestPromises from 'test_utils/no_digest_promises';
import Promise from 'bluebird';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import MockState from 'fixtures/mock_state';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import sinon from 'auto-release-sinon';
import chrome from 'ui/chrome';
import _ from 'lodash';

const fakeSavedDashboards = [
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
const fakeSavedDashboardGroups = [
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
const fakeSavedDashboardsForCounts = [
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
const fakeSavedSearches = [
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

let dashboardGroups;
let appState;
let kibiState;
let es;
let joinExplanation;

let setSelectedDashboardIdStub;
let switchDashboardStub;

function init({ currentDashboardId = 'Articles', indexPatterns, savedDashboards, savedDashboardGroups, savedSearches } = {}) {
  ngMock.module('kibana', function ($provide) {
    $provide.constant('kibiEnterpriseEnabled', false);
    $provide.constant('kbnDefaultAppId', 'dashboard');
    $provide.constant('kibiDefaultDashboardTitle', 'Articles');

    appState = new MockState({ filters: [] });
    $provide.service('getAppState', () => {
      return function () { return appState; };
    });

    $provide.service('$timeout', () => {
      const mockTimeout = fn => Promise.resolve(fn());
      mockTimeout.cancel = _.noop;
      return mockTimeout;
    });

    $provide.service('joinExplanation', () => {
      return {
        constructFilterIconMessage: (filters, queries) => {
          const defaultQuery = {
            query_string: {
              analyze_wildcard: true,
              query: '*'
            }
          };
          let explanationString = '';
          const nFilters = _.reject(filters, 'meta.fromSavedSearch').length;
          const hasQuery = !_.isEqual(queries[0], defaultQuery);
          if (hasQuery || nFilters) {
            if(nFilters) {
              explanationString += `filters: ${nFilters}`;
            }
            if (hasQuery) {
              explanationString += ` queries: ${queries.length - 1}`;
            }
            return Promise.resolve(explanationString);
          } else {
            return Promise.resolve(null);
          }
        }
      };
    });
  });

  ngMock.module('app/dashboard', function ($provide) {
    $provide.service('savedDashboards', (Promise, Private) => {
      return mockSavedObjects(Promise, Private)('savedDashboard', savedDashboards || []);
    });
  });

  ngMock.module('kibana/index_patterns', function ($provide) {
    $provide.service('indexPatterns', (Promise, Private) => mockSavedObjects(Promise, Private)('indexPatterns', indexPatterns || []));
  });

  ngMock.module('kibi_core/saved_objects/dashboard_groups', function ($provide) {
    $provide.service('savedDashboardGroups', (Promise, Private) => {
      return mockSavedObjects(Promise, Private)('savedDashboardGroups', savedDashboardGroups || []);
    });
  });

  ngMock.module('discover/saved_searches', function ($provide) {
    $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', savedSearches || []));
  });

  ngMock.inject(function (Private, _es_, _dashboardGroups_, _kibiState_, _joinExplanation_) {
    const dashboardHelper = Private(DashboardHelperProvider);
    switchDashboardStub = sinon.stub(dashboardHelper, 'switchDashboard');
    kibiState = _kibiState_;
    dashboardGroups = _dashboardGroups_;
    sinon.stub(chrome, 'getBasePath').returns('');
    sinon.stub(kibiState, '_getCurrentDashboardId').returns(currentDashboardId);
    sinon.stub(kibiState, 'isSirenJoinPluginInstalled').returns(true);
    setSelectedDashboardIdStub = sinon.stub(kibiState, 'setSelectedDashboardId');
    es = _es_;
    joinExplanation = _joinExplanation_;

  });
}

describe('Kibi Services', function () {
  describe('DashboardGroups Service', function () {

    noDigestPromises.activateForSuite();

    describe('copy', function () {
      beforeEach(init);

      it('copy src dashboard groups', function () {
        const src = [
          {
            id: 'group1',
            active: true,
            hide: false,
            iconCss: 'icon aaa',
            iconUrl: 'icon aaa',
            priority: 1,
            title: 'title 1',
            selected: { id: 'd1' },
            dashboards: [ { id: 'd1' } ],
            virtual: true
          },
          {
            id: 'group2',
            active: true,
            hide: false,
            iconCss: 'icon aaa',
            iconUrl: 'icon aaa',
            priority: 2,
            title: 'title 2',
            selected: { id: 'd2' },
            dashboards: [ { id: 'd2' } ]
          }
        ];
        const dst = [
          {
            id: 'group1',
            active: false,
            hide: true,
            iconCss: 'icon bbb',
            iconUrl: 'icon bbb',
            priority: -1,
            title: 'title 0',
            selected: { id: 'd0' },
            dashboards: [ { id: 'd0' } ]
          },
          {
            id: 'group3',
            active: true,
            hide: false,
            iconCss: 'icon aaa',
            iconUrl: 'icon aaa',
            priority: 3,
            title: 'title 3',
            selected: { id: 'd3' },
            dashboards: [ { id: 'd3' } ]
          }
        ];

        dashboardGroups.copy(src, dst);
        expect(dst).to.have.length(2);

        expect(dst[0].id).to.be('group1');
        expect(dst[0].active).to.be(true);
        expect(dst[0].hide).to.be(false);
        expect(dst[0].iconCss).to.be('icon aaa');
        expect(dst[0].iconUrl).to.be('icon aaa');
        expect(dst[0].priority).to.be(1);
        expect(dst[0].title).to.be('title 1');
        expect(dst[0].dashboards).to.have.length(1);
        expect(dst[0].dashboards[0].id).to.be('d1');
        expect(dst[0].virtual).to.be(true);

        expect(dst[1].id).to.be('group2');
        expect(dst[1].active).to.be(true);
        expect(dst[1].hide).to.be(false);
        expect(dst[1].iconCss).to.be('icon aaa');
        expect(dst[1].iconUrl).to.be('icon aaa');
        expect(dst[1].priority).to.be(2);
        expect(dst[1].title).to.be('title 2');
        expect(dst[1].virtual).to.be(undefined);
      });

      it('save metadata from dest groups', function () {
        const src = [
          {
            id: 'group1',
            selected: { id: 'd1' },
            dashboards: [ { id: 'd1' }, { id: 'd2' } ]
          }
        ];
        const dst = [
          {
            id: 'group1',
            selected: {
              id: 'd1',
              count: 123,
              filterIconMessage: 'filter that',
              isPruned: true,
            },
            dashboards: [
              {
                id: 'd0'
              },
              {
                id: 'd1',
                count: 123,
                filterIconMessage: 'filter that',
                isPruned: true,
              },
              {
                id: 'd2',
                count: 456,
                filterIconMessage: 'filter this',
                isPruned: false,
              }
            ]
          }
        ];

        dashboardGroups.copy(src, dst);
        expect(dst).to.have.length(1);

        expect(dst[0].id).to.be('group1');
        expect(dst[0].selected.count).to.be(123);
        expect(dst[0].selected.filterIconMessage).to.be('filter that');
        expect(dst[0].selected.isPruned).to.be(true);
        expect(dst[0].dashboards).to.have.length(2);
        expect(dst[0].dashboards[0].id).to.be('d1');
        expect(dst[0].dashboards[0].count).to.be(123);
        expect(dst[0].dashboards[0].filterIconMessage).to.be('filter that');
        expect(dst[0].dashboards[0].isPruned).to.be(true);
        expect(dst[0].dashboards[1].id).to.be('d2');
        expect(dst[0].dashboards[1].count).to.be(456);
        expect(dst[0].dashboards[1].filterIconMessage).to.be('filter this');
        expect(dst[0].dashboards[1].isPruned).to.be(false);
      });
    });

    describe('Simple tests', function () {
      beforeEach(() => init({
        savedDashboards: fakeSavedDashboards,
        savedDashboardGroups: fakeSavedDashboardGroups,
        savedSearches: fakeSavedSearches
      }));

      describe('_shortenDashboardName', function () {
        it('should shorten', function () {
          expect(dashboardGroups._shortenDashboardName('TEST', 'TEST dashboard')).to.be('dashboard');
          expect(dashboardGroups._shortenDashboardName('TEST', 'TEST-dashboard')).to.be('dashboard');
        });

        it('should not shorten', function () {
          expect(dashboardGroups._shortenDashboardName('BLA', 'TEST dashboard')).to.be('TEST dashboard');
          expect(dashboardGroups._shortenDashboardName('BLA', 'TEST-dashboard')).to.be('TEST-dashboard');
        });
      });

      it('_getListOfDashboardsFromGroups', function () {
        const dA = { id: 'A' };
        const dB = { id: 'B' };
        const dC = { id: 'C' };
        const groups = [
          {
            dashboards: [dA, dB]
          },
          {
            dashboards: [dA, dB, dC]
          }
        ];

        const actual = dashboardGroups._getListOfDashboardsFromGroups(groups);
        expect(actual.length).to.be(3);
        expect(actual[0]).to.be(dA);
        expect(actual[1]).to.be(dB);
        expect(actual[2]).to.be(dC);
      });
    });

    describe('compute groups', function () {
      describe('on no dashboard', function () {
        beforeEach(() => init({
          currentDashboardId: '',
          savedDashboards: fakeSavedDashboards,
          savedDashboardGroups: fakeSavedDashboardGroups,
          savedSearches: fakeSavedSearches
        }));

        it('no current dashboard', function (done) {
          dashboardGroups.computeGroups().then(function (groups) {
            // computeGroups should return all 5 groups, even when no dashboard is selected
            expect(groups).to.have.length(5);
            done();
          }).catch(done);
        });
      });

      describe('getGroup', function () {
        it('should get the group the dashboard belongs to', function () {
          return dashboardGroups.computeGroups().then(function () {
            const group = dashboardGroups.getGroup('Articles');
            expect(group).to.be.ok();
            expect(group.id).to.eql('group-1');
          });
        });
      });

      describe('getIdsOfDashboardGroupsTheseDashboardsBelongTo', function () {
        it('there is a group with the dashboard', function () {
          const dashboardIds = ['Articles'];
          const expected = ['group-1'];

          return dashboardGroups.computeGroups().then(function () {
            expect(dashboardGroups.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds)).to.eql(expected);
          });
        });

        it('there is no group with the dashboard', function () {
          const dashboardIds = ['ArticlesXXX'];

          return dashboardGroups.computeGroups().then(function () {
            expect(dashboardGroups.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds)).to.have.length(0);
          });
        });

        it('should not return virtual groups', function () {
          const dashboardIds = ['time-testing-1'];

          return dashboardGroups.computeGroups().then(function () {
            expect(dashboardGroups.getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds)).to.have.length(0);
          });
        });
      });

      describe('selectDashboard', function () {
        beforeEach(() => init({
          savedDashboards: fakeSavedDashboards,
          savedDashboardGroups: fakeSavedDashboardGroups,
          savedSearches: fakeSavedSearches
        }));

        it('should switch to desired dashboard', function () {
          return dashboardGroups.computeGroups()
          .then(() => dashboardGroups.selectDashboard('Articles'))
          .then(() => {
            _.each(dashboardGroups.getGroups(), group => {
              if (group.id === 'group-1') {
                expect(group.active).to.be(true);
                expect(group.selected.id).to.be('Articles');
                sinon.assert.calledWith(setSelectedDashboardIdStub, 'group-1', 'Articles');
                sinon.assert.calledWith(switchDashboardStub, 'Articles');
              } else {
                expect(group.active).to.be(false);
              }
            });
          });
        });

        it('should not save in state the selected dashboard when switching to desired dashboard if the group is virtual', function () {
          return dashboardGroups.computeGroups()
          .then(() => dashboardGroups.selectDashboard('time-testing-1'))
          .then(() => {
            _.each(dashboardGroups.getGroups(), group => {
              if (group.id === 'time-testing-1') {
                expect(group.active).to.be(true);
                expect(group.selected.id).to.be('time-testing-1');
                sinon.assert.notCalled(setSelectedDashboardIdStub);
                sinon.assert.calledWith(switchDashboardStub, 'time-testing-1');
              } else {
                expect(group.active).to.be(false);
              }
            });
          });
        });
      });

      describe('for the current dashboard Articles', function () {
        beforeEach(() => init({
          savedDashboards: fakeSavedDashboards,
          savedDashboardGroups: fakeSavedDashboardGroups,
          savedSearches: fakeSavedSearches
        }));

        it('computeGroups 1', function (done) {
          dashboardGroups.computeGroups().then(function (groups) {

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

        it('should create virtual groups for dashboards without one set by the user', function () {
          return dashboardGroups.computeGroups()
          .then(function (groups) {
            const group1 = _.find(groups, 'id', 'group-1');

            expect(group1).to.be.ok();
            expect(group1.virtual).to.not.be.ok();

            const timeTesting1 = _.find(groups, 'id', 'time-testing-1');
            expect(timeTesting1).to.be.ok();
            expect(timeTesting1.virtual).to.be(true);
          });
        });
      });

      describe('dashboards do not exist', function () {
        beforeEach(() => init({ savedDashboardGroups: fakeSavedDashboardGroups }));

        it('computeGroups 2', function (done) {
          dashboardGroups.computeGroups()
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
        beforeEach(() => init({ savedDashboards: fakeSavedDashboards, savedSearches: fakeSavedSearches }));

        it('computeGroups 3', function (done) {
          dashboardGroups.computeGroups().then(function (groups) {
            // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
            expect(groups).to.have.length(5);
            done();
          }).catch(done);
        });
      });

      describe('no dashboards groups, no dashboards', function () {
        beforeEach(() => init({ savedSearches: fakeSavedSearches }));

        it('computeGroups 4', function (done) {
          dashboardGroups.computeGroups().then(function (groups) {
            // here if there are no groups but there are 5 dashboards we expect 5 pseudo group created
            expect(groups).to.have.length(0);
            done();
          }).catch(done);
        });
      });
    });

    describe('filter icon message', function () {
      beforeEach(() => init({
        currentDashboardId: 'myDashboard',
        indexPatterns: [
          {
            id: 'myindex'
          }
        ],
        savedDashboardGroups: [
          {
            id: 'mygroup',
            title: 'MyGroup',
            dashboards: [
              {
                id: 'myDashboard'
              }
            ]
          }
        ],
        savedDashboards: [
          {
            id: 'myDashboard',
            title: 'myDashboard',
            savedSearchId: 'search with a filter and a query'
          }
        ],
        savedSearches: [
          {
            id: 'search with a filter and a query',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'myindex',
                  filter: [ { query: {}, meta: { disabled: false } } ],
                  query: {
                    query_string: {
                      query: 'ibm'
                    }
                  }
                }
              )
            }
          }
        ]
      }));

      it('should be null if there is no query nor filters', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        }));

        return dashboardGroups.computeGroups()
        .then(() => dashboardGroups.updateMetadataOfDashboardIds(['myDashboard']))
        .then(function () {
          const groups = dashboardGroups.getGroups();
          const myGroup = _.find(groups, 'id', 'mygroup');
          const myDashboard = _.find(myGroup.dashboards, 'id', 'myDashboard');
          expect(myDashboard.filterIconMessage).to.be(null);
        });
      });

      it('should say there is 1 filter', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        }));
        appState.filters = [ { meta: { disabled: false } } ];

        return dashboardGroups.computeGroups()
        .then(() => dashboardGroups.updateMetadataOfDashboardIds(['myDashboard']))
        .then(function () {
          const groups = dashboardGroups.getGroups();
          const myGroup = _.find(groups, 'id', 'mygroup');
          const myDashboard = _.find(myGroup.dashboards, 'id', 'myDashboard');
          expect(myDashboard.filterIconMessage).to.be('filters: 1');
        });
      });

      it('should not say there is 1 query if default', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        }));
        appState.query = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };

        return dashboardGroups.computeGroups()
        .then(() => dashboardGroups.updateMetadataOfDashboardIds(['myDashboard']))
        .then(function () {
          const groups = dashboardGroups.getGroups();
          const myGroup = _.find(groups, 'id', 'mygroup');
          const myDashboard = _.find(myGroup.dashboards, 'id', 'myDashboard');
          expect(myDashboard.filterIconMessage).to.be(null);
        });
      });

      it('should return query text for 1 query', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        }));
        appState.query = {
          query_string: {
            query: 'torrent',
            analyze_wildcard: true
          }
        };

        return dashboardGroups.computeGroups()
        .then(() => dashboardGroups.updateMetadataOfDashboardIds(['myDashboard']))
        .then(function () {
          const groups = dashboardGroups.getGroups();
          const myGroup = _.find(groups, 'id', 'mygroup');
          const myDashboard = _.find(myGroup.dashboards, 'id', 'myDashboard');
          expect(myDashboard.filterIconMessage).to.be(' queries: 1');
        });
      });

      it('should return query and filter text for 1 query and 1 filter', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        }));
        appState.query = {
          query_string: {
            query: 'torrent',
            analyze_wildcard: true
          }
        };
        appState.filters = [ { meta: { disabled: false } } ];

        return dashboardGroups.computeGroups()
        .then(() => dashboardGroups.updateMetadataOfDashboardIds(['myDashboard']))
        .then(function () {
          const groups = dashboardGroups.getGroups();
          const myGroup = _.find(groups, 'id', 'mygroup');
          const myDashboard = _.find(myGroup.dashboards, 'id', 'myDashboard');
          expect(myDashboard.filterIconMessage).to.be('filters: 1 queries: 1');
        });
      });

      it('should say there is 1 query and 2 filters', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        }));
        appState.query = {
          query_string: {
            query: 'torrent',
            analyze_wildcard: true
          }
        };
        appState.filters = [ { a: {}, meta: { disabled: false } }, { b: {}, meta: { disabled: false } } ];

        return dashboardGroups.computeGroups()
        .then(() => dashboardGroups.updateMetadataOfDashboardIds(['myDashboard']))
        .then(function () {
          const groups = dashboardGroups.getGroups();
          const myGroup = _.find(groups, 'id', 'mygroup');
          const myDashboard = _.find(myGroup.dashboards, 'id', 'myDashboard');
          expect(myDashboard.filterIconMessage).to.be('filters: 2 queries: 1');
        });
      });
    });

    describe('_getDashboardsMetadata', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'time-testing-4',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          }
        ],
        savedDashboards: fakeSavedDashboardsForCounts.concat(
          {
            id: 'dashboardX',
            title: 'dashboardX',
            savedSearchId: 'searchX'
          }
        ),
        savedSearches: fakeSavedSearches
      }));

      afterEach(() => {
        Notifier.prototype._notifs.length = 0;
      });

      it('dashboard does NOT exist', function (done) {
        dashboardGroups._getDashboardsMetadata(['dash-do-not-exist']).then(function (meta) {
          expect(meta).to.eql([]);
          done();
        }).catch(done);
      });

      it('dashboard exist but has no savedSearch', function () {
        return dashboardGroups._getDashboardsMetadata(['Articles'])
        .then(function (meta) {
          expect(meta).to.have.length(0);
        });
      });

      it('dashboard exist and it references an unknown saved search', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 0
              }
            },
            {
              hits: {
                total: 42
              }
            }
          ]
        }));

        return dashboardGroups._getDashboardsMetadata([ 'dashboardX', 'time-testing-4' ])
        .then(function (metas) {
          expect(metas.length).to.equal(2);
          expect(metas[0].count).to.equal('Error');
          expect(metas[0].dashboardId).to.equal('dashboardX');
          expect(metas[1].count).to.equal(42);
          expect(metas[1].isPruned).to.equal(false);
          expect(metas[1].dashboardId).to.equal('time-testing-4');
          expect(metas[1].indices).to.eql(['time-testing-4']);

          expect(Notifier.prototype._notifs).to.have.length(1);
          expect(Notifier.prototype._notifs[0].type).to.be('warning');
          expect(Notifier.prototype._notifs[0].content)
            .to.contain('The dashboard [dashboardX] is associated with an unknown saved search.');
        });
      });

      it('dashboard exist and it has savedSearch but index does not exists', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 0
              }
            },
            {
              hits: {
                total: 42
              }
            }
          ]
        }));

        return dashboardGroups._getDashboardsMetadata([ 'search-ste', 'time-testing-4' ])
        .then(function (metas) {
          expect(metas.length).to.equal(2);
          expect(metas[0].count).to.equal('Error');
          expect(metas[0].dashboardId).to.equal('search-ste');
          expect(metas[1].count).to.equal(42);
          expect(metas[1].isPruned).to.equal(false);
          expect(metas[1].dashboardId).to.equal('time-testing-4');
          expect(metas[1].indices).to.eql(['time-testing-4']);

          expect(Notifier.prototype._notifs).to.have.length(1);
          expect(Notifier.prototype._notifs[0].type).to.be('warning');
          expect(Notifier.prototype._notifs[0].content).to.contain('Could not find object with id: search-ste');
        });
      });

      it('dashboard exist and it has savedSearch and index exists', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              hits: {
                total: 42
              }
            }
          ]
        }));

        return dashboardGroups._getDashboardsMetadata(['time-testing-4'])
        .then(function (metas) {
          expect(metas.length).to.equal(1);
          expect(metas[0].count).to.equal(42);
          expect(metas[0].isPruned).to.equal(false);
          expect(metas[0].dashboardId).to.equal('time-testing-4');
          expect(metas[0].indices).to.eql(['time-testing-4']);
        });
      });

      it('dashboard exist and it has savedSearch and index exists the results were pruned', function () {
        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [
            {
              coordinate_search: {
                actions: [
                  {
                    is_pruned: true
                  }
                ]
              },
              hits: {
                total: 42
              }
            }
          ]
        }));

        return dashboardGroups._getDashboardsMetadata(['time-testing-4'])
        .then(function (metas) {
          expect(metas.length).to.equal(1);
          expect(metas[0].count).to.equal(42);
          expect(metas[0].isPruned).to.equal(true);
          expect(metas[0].dashboardId).to.equal('time-testing-4');
          expect(metas[0].indices).to.eql(['time-testing-4']);
        });
      });

      it('dashboard exist and it has savedSearch and index exists but is not accessible', function () {
        const authError = new Error();
        authError.status = 403;

        sinon.stub(kibiState, 'timeBasedIndices').returns(Promise.reject(authError));

        sinon.stub(es, 'msearch').returns(Promise.resolve({
          responses: [{
            hits: {
              total: 0
            }
          }]
        }));

        return dashboardGroups._getDashboardsMetadata(['time-testing-4'])
        .then(function (metas) {
          expect(metas.length).to.equal(1);
          expect(metas[0].count).to.equal('Forbidden');
          expect(metas[0].forbidden).to.be(true);
          expect(metas[0].dashboardId).to.equal('time-testing-4');
          expect(metas[0].indices).to.eql([]);
        });
      });

      it('dashboard exist and it has savedSearch and index exists but a non auth error occurs when resolving indices', function () {
        sinon.stub(kibiState, 'timeBasedIndices').returns(Promise.reject(new Error('timeBasedIndices failed')));

        dashboardGroups._getDashboardsMetadata(['time-testing-4'])
        .then(function (metas) {
          expect(metas.length).to.equal(1);
          expect(metas[0].count).to.equal('Error');
          expect(metas[0].indices).to.eql(['time-testing-4']);

          expect(Notifier.prototype._notifs).to.have.length(1);
          expect(Notifier.prototype._notifs[0].type).to.be('warning');
          expect(Notifier.prototype._notifs[0].content).to.contain('timeBasedIndices failed');
        });
      });
    });

    describe('highlight dashboard', function () {
      beforeEach(() => init({
        savedDashboards: [
          {
            title: 'DA',
            id: 'A'
          },
          {
            title: 'DB',
            id: 'B'
          },
          {
            title: 'DC',
            id: 'C'
          }
        ],
        savedDashboardGroups: [
          {
            id: 'group 1',
            title: 'Group 1',
            dashboards: [
              {
                title: 'DA',
                id: 'A'
              },
              {
                title: 'DB',
                id: 'B'
              }
            ]
          },
          {
            id: 'group 2',
            title: 'Group 2',
            dashboards: [
              {
                title: 'DB',
                id: 'B'
              },
              {
                title: 'DC',
                id: 'C'
              }
            ]
          }
        ]
      }));

      beforeEach(() => dashboardGroups.computeGroups());

      it('setGroupHighlight', function () {
        const dashboardId = 'A';

        dashboardGroups.setGroupHighlight(dashboardId);
        expect(dashboardGroups.getGroups()[0].dashboards[0].$$highlight).to.equal(true);
        expect(dashboardGroups.getGroups()[0].dashboards[1].$$highlight).to.equal(false);
      });

      it('resetGroupHighlight', function () {
        const dashboardId = 'A';

        dashboardGroups.setGroupHighlight(dashboardId);
        expect(dashboardGroups.getGroups()[0].dashboards[0].$$highlight).to.equal(true);
        expect(dashboardGroups.getGroups()[0].dashboards[1].$$highlight).to.equal(false);

        dashboardGroups.resetGroupHighlight();
        expect(dashboardGroups.getGroups()[0].dashboards[0].$$highlight).to.equal(false);
        expect(dashboardGroups.getGroups()[0].dashboards[1].$$highlight).to.equal(false);
      });
    });
  });
});
