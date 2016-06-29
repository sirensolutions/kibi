const _ = require('lodash');
const MockState = require('fixtures/mock_state');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const Promise = require('bluebird');
const expect = require('expect.js');
const ngMock = require('ngMock');
const dateMath = require('ui/utils/dateMath');

require('ui/kibi/state_management/kibi_state');

describe('State Management', function () {
  let $location;
  let kibiState;
  let config;
  let timefilter;
  let appState;
  let globalState;
  const defaultStartTime = '2006-09-01T12:00:00.000Z';
  const defaultEndTime = '2010-09-05T12:00:00.000Z';

  const init = function ({ kibiEnterpriseEnabled = false, pinned, savedDashboards, savedSearches, indexPatterns,
                         currentPath = '/dashboard', currentDashboardId = 'dashboard1' }) {
    ngMock.module('kibana', 'kibana/courier', 'kibana/global_state', ($provide) => {
      $provide.service('$route', () => {
        var myRoute = {
          current: {
            $$route: {
              originalPath: currentPath
            },
            locals: {
              dash: {
                id: currentDashboardId
              }
            }
          }
        };
        if (currentPath === null) {
          delete myRoute.current.$$route;
        } else if (currentDashboardId === null) {
          delete myRoute.current.locals;
        }
        return myRoute;
      });

      appState = new MockState({ filters: [] });
      $provide.service('getAppState', () => {
        return function () { return appState; };
      });

      globalState = new MockState({ filters: pinned || [] });
      $provide.service('globalState', () => {
        return globalState;
      });

      $provide.constant('kibiEnterpriseEnabled', kibiEnterpriseEnabled);
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.module('kibana/index_patterns', function ($provide) {
      $provide.service('indexPatterns', (Promise) => mockSavedObjects(Promise)('indexPatterns', indexPatterns || []));
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', savedSearches || []));
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards || []));
    });

    ngMock.inject(function (_timefilter_, _config_, _$location_, _kibiState_) {
      timefilter = _timefilter_;
      $location = _$location_;
      kibiState = _kibiState_;
      config = _config_;
      const defaultTime = {
        mode: 'absolute',
        from: defaultStartTime,
        to: defaultEndTime
      };
      config.set('timepicker:timeDefaults', defaultTime);
      timefilter.time = defaultTime;
    });
  };

  describe('Kibi State', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    describe('General Helpers', function () {
      beforeEach(() => init({
        savedDashboards: [
          {
            id: 'dashboard0',
            title: 'dashboard0'
          }
        ]
      }));

      it('should have _urlParam of _k', function () {
        expect(kibiState).to.have.property('_urlParam');
        expect(kibiState._urlParam).to.equal('_k');
      });

      it('should use previous state when not in URL', function () {
        // set satte via URL
        $location.search({ _k: '(foo:(bar:baz))' });
        kibiState.fetch();
        expect(kibiState.toObject()).to.eql({ foo: { bar: 'baz' } });

        $location.search({ _k: '(fizz:buzz)' });
        kibiState.fetch();
        expect(kibiState.toObject()).to.eql({ fizz: 'buzz' });

        $location.search({});
        kibiState.fetch();
        expect(kibiState.toObject()).to.eql({ fizz: 'buzz' });
      });

      it('should fail if dashboard is not passed', function (done) {
        kibiState.getState().catch(function (err) {
          expect(err.message).to.be('Missing dashboard ID');
          done();
        }).catch(done);
      });

      it('should fail when the dashboard is not associated to a search', function () {
        const msg = 'The dashboard [dashboard0] is expected to be associated with a saved search.';
        expect(kibiState.getState).withArgs('dashboard0').to.throwException(msg);
      });
    });

    describe('getCurrentDashboardId', function () {
      it('getCurrentDashboardId', function () {
        init({ currentDashboardId: 'dashboard1' });
        expect(kibiState._getCurrentDashboardId()).to.equal('dashboard1');
      });

      it('getCurrentDashboardId when not on dashboard', function () {
        init({ currentDashboardId: null, currentPath: '/notdashboard/xxx' });
        expect(kibiState._getCurrentDashboardId()).to.equal(undefined);
      });
    });

    describe('getDashboardAndSavedSearchMetas', function () {
      beforeEach(() => init({
        savedDashboards: [
          {
            id: 'Articles',
            title: 'Articles'
          },
          {
            id: 'search-ste',
            title: 'search-ste',
            savedSearchId: 'search-ste'
          }
        ],
        savedSearches: [
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
          }
        ]
      }));

      it('get saved dashboard and saved search the order of dashboardIds should be preserved' , function (done) {
        var ignoreMissingSavedSearch = true;
        // this tests checks that although the savedDashboard order is
        // 'Articles', 'search-ste'
        // when we provide the ids in reverse order like 'search-ste', 'Articles'
        // we get the meta in the same order as the ids were provided
        kibiState._getDashboardAndSavedSearchMetas([ 'search-ste', 'Articles'], ignoreMissingSavedSearch).then(function (results) {
          expect(results).to.have.length(2);
          expect(results[0].savedDash.id).to.be('search-ste');
          expect(results[0].savedSearchMeta.index).to.be('search-ste');
          expect(results[1].savedDash.id).to.be('Articles');
          expect(results[1].savedSearchMeta).to.be(null);
          done();
        }).catch(done);
      });

      it('get saved dashboard and saved search the order of dashboardIds should be preserved 2' , function (done) {
        var ignoreMissingSavedSearch = true;
        kibiState._getDashboardAndSavedSearchMetas([ 'Articles', 'search-ste'], ignoreMissingSavedSearch).then(function (results) {
          expect(results).to.have.length(2);
          expect(results[0].savedDash.id).to.be('Articles');
          expect(results[0].savedSearchMeta).to.be(null);
          expect(results[1].savedDash.id).to.be('search-ste');
          expect(results[1].savedSearchMeta.index).to.be('search-ste');
          done();
        }).catch(done);
      });

      it('get saved dashboard and saved search', function (done) {
        kibiState._getDashboardAndSavedSearchMetas([ 'search-ste' ]).then(function (results) {
          expect(results).to.have.length(1);
          expect(results[0].savedDash.id).to.be('search-ste');
          expect(results[0].savedSearchMeta.index).to.be('search-ste');
          done();
        }).catch(done);
      });

      it('should reject promise if saved search is missing for dashboard', function (done) {
        kibiState._getDashboardAndSavedSearchMetas([ 'Articles' ]).then(function (results) {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.be('The dashboard [Articles] is expected to be associated with a saved search.');
          done();
        });
      });

      it('should NOT reject if saved search is missing for dashboard but ignoreMissingSavedSearch=true', function (done) {
        var ignoreMissingSavedSearch = true;
        kibiState._getDashboardAndSavedSearchMetas([ 'Articles', 'search-ste' ], ignoreMissingSavedSearch).then(function (results) {
          done();
        }).catch(done);
      });

      it('should reject promise if an unknown dashboard is requested', function (done) {
        kibiState._getDashboardAndSavedSearchMetas([ 'search-ste', 'unknown dashboard' ]).then(function (results) {
          done('should fail');
        }).catch(function (err) {
          expect(err.message).to.be('Unable to retrieve dashboards: ["unknown dashboard"].');
          done();
        });
      });
    });

    describe('addAdvancedJoinSettingsToRelation', function () {
      beforeEach(() => init({
        kibiEnterpriseEnabled: true
      }));

      it('should fail if the relation is not present', function () {
        config.set('kibi:relations', {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'investor',
                  path: 'id'
                },
                {
                  indexPatternId: 'investment',
                  path: 'investorid'
                }
              ],
              label: 'by',
              id: 'investment/investorid/investor/id'
            }
          ]
        });
        const missingRelation = [
          {
            indices: [ 'company' ],
            path: 'id'
          },
          {
            indices: [ 'article' ],
            path: 'companies'
          }
        ];

        expect(kibiState._addAdvancedJoinSettingsToRelation).withArgs(missingRelation)
        .to.throwException(/Could not find index relation corresponding to relation between/);
      });

      it('should get advanced relation for the given relation', function () {
        config.set('kibi:relations', {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'investor',
                  path: 'id',
                  termsEncoding: 'enc1',
                  orderBy: 'asc',
                  maxTermsPerShard: 1
                },
                {
                  indexPatternId: 'investment',
                  path: 'investorid',
                  termsEncoding: 'enc2',
                  orderBy: 'desc',
                  maxTermsPerShard: 2
                }
              ],
              label: 'by',
              id: 'investment/investorid/investor/id'
            }
          ]
        });

        const relation1 = [
          {
            indices: [ 'investment' ],
            path: 'investorid'
          },
          {
            indices: [ 'investor' ],
            path: 'id'
          }
        ];
        kibiState._addAdvancedJoinSettingsToRelation(relation1);
        expect(relation1[0].termsEncoding).to.be('enc1');
        expect(relation1[0].orderBy).to.be('asc');
        expect(relation1[0].maxTermsPerShard).to.be(1);
        expect(relation1[1].termsEncoding).to.be('enc2');
        expect(relation1[1].orderBy).to.be('desc');
        expect(relation1[1].maxTermsPerShard).to.be(2);

        const relation2 = [
          {
            indices: [ 'investor' ],
            path: 'id'
          },
          {
            indices: [ 'investment' ],
            path: 'investorid'
          }
        ];
        kibiState._addAdvancedJoinSettingsToRelation(relation2);
        expect(relation2[0].termsEncoding).to.be('enc2');
        expect(relation2[0].orderBy).to.be('desc');
        expect(relation2[0].maxTermsPerShard).to.be(2);
        expect(relation2[1].termsEncoding).to.be('enc1');
        expect(relation2[1].orderBy).to.be('asc');
        expect(relation2[1].maxTermsPerShard).to.be(1);
      });
    });

    describe('Time', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'index1',
            timeFieldName: 'date',
            fields: [
              {
                name: 'date'
              }
            ]
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1'
          },
          {
            id: 'dashboard2',
            title: 'dashboard2',
            savedSearchId: 'search1'
          }
        ],
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({ index: 'index1' })
            }
          }
        ],
      }));

      it('should get correct time', function (done) {
        kibiState._saveTimeForDashboardId('dashboard2', 'absolute', '2004-09-01T12:00:00.000Z', '2010-09-01T12:00:00.000Z');
        timefilter.time = {
          mode: 'absolute',
          from: '2006-09-01T12:00:00.000Z',
          to: '2009-09-01T12:00:00.000Z'
        };
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.time).to.eql({
            range: {
              date: {
                gte: dateMath.parseWithPrecision('2006-09-01T12:00:00.000Z', false).valueOf(),
                lte: dateMath.parseWithPrecision('2009-09-01T12:00:00.000Z', true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          expect(state2.time).to.eql({
            range: {
              date: {
                gte: dateMath.parseWithPrecision('2004-09-01T12:00:00.000Z', false).valueOf(),
                lte: dateMath.parseWithPrecision('2010-09-01T12:00:00.000Z', true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          done();
        }).catch(done);
      });

      it('should get default time', function (done) {
        kibiState.getState('dashboard2')
        .then(({ time }) => {
          expect(time).to.eql({
            range: {
              date: {
                gte: dateMath.parseWithPrecision(defaultStartTime, false).valueOf(),
                lte: dateMath.parseWithPrecision(defaultEndTime, true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          done();
        }).catch(done);
      });
    });

    describe('Query', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'index1',
            timeFieldName: 'date',
            fields: [
              {
                name: 'date'
              }
            ]
          }
        ],
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: [],
                  query: {
                    query_string: {
                      query: 'torrent'
                    }
                  }
                }
              )
            }
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1'
          },
          {
            id: 'dashboard2',
            title: 'dashboard2',
            savedSearchId: 'search1'
          }
        ]
      }));

      it('should not alter the kibistate query', function (done) {
        const query = {
          query_string: {
            query: 'mobile'
          }
        };

        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query);
        kibiState.getState('dashboard2')
        .then(({ queries }) => {
          expect(queries).to.have.length(2);
          queries[0].query.query_string.query = 'toto';
          queries[1].query.query_string.query = 'tata';
          expect(kibiState._getDashboardProperty('dashboard2', kibiState._properties.query).query_string.query).to.be('mobile');
          done();
        }).catch(done);
      });

      it('should not alter the appstate query', function (done) {
        const query1 = {
          query_string: {
            query: 'mobile'
          }
        };

        appState.query = query1;
        kibiState.getState('dashboard1')
        .then(({ queries }) => {
          expect(queries).to.have.length(2);
          queries[0].query.query_string.query = 'toto';
          queries[1].query.query_string.query = 'tata';
          expect(appState.query.query_string.query).to.be('mobile');
          done();
        }).catch(done);
      });

      it('should combine queries from the appstate/kibistate with the one from the search meta', function (done) {
        const query1 = {
          query_string: {
            query: 'mobile'
          }
        };
        const query2 = {
          query_string: {
            query: 'web'
          }
        };

        appState.query = query1;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query2);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.queries).to.eql([ { query: query1 }, { query: { query_string: { query: 'torrent' } } } ]);
          expect(state2.queries).to.eql([ { query: query2 }, { query: { query_string: { query: 'torrent' } } } ]);
          done();
        }).catch(done);
      });

      it('should remove duplicates', function (done) {
        const query = {
          query_string: {
            query: 'torrent'
          }
        };

        appState.query = query;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.queries).to.eql([ { query: { query_string: { query: 'torrent' } } } ]);
          expect(state2.queries).to.eql([ { query: { query_string: { query: 'torrent' } } } ]);
          done();
        }).catch(done);
      });
    });

    describe('Filters', function () {
      beforeEach(() => init({
        indexPatterns: [
          {
            id: 'index1',
            timeFieldName: 'date',
            fields: [
              {
                name: 'date'
              }
            ]
          }
        ],
        pinned: [
          {
            term: { field1: 'i am pinned' },
            meta: { disabled: false }
          },
          {
            term: { field1: 'i am pinned and disabled' },
            meta: { disabled: true }
          }
        ],
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: [
                    {
                      term: { field1: 'aaa' },
                      meta: { disabled: false }
                    },
                    {
                      term: { field1: 'eee' },
                      meta: { disabled: true }
                    }
                  ]
                }
              )
            }
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1'
          },
          {
            id: 'dashboard2',
            title: 'dashboard2',
            savedSearchId: 'search1'
          }
        ]
      }));

      it('should not alter the kibistate filters', function (done) {
        const filters = [
          {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          }
        ];

        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, filters);
        kibiState.getState('dashboard2')
        .then(({ filters }) => {
          expect(filters).to.have.length(3);
          // kibistate
          expect(filters[0].term.field1).to.be('bbb');
          // pinned filter
          expect(filters[1].term.field1).to.be('i am pinned');
          // search meta
          expect(filters[2].term.field1).to.be('aaa');
          const kibiStateFilters = kibiState._getDashboardProperty('dashboard2', kibiState._properties.filters);
          expect(kibiStateFilters).to.have.length(1);
          expect(kibiStateFilters[0].term.field1).to.be('bbb');
          done();
        }).catch(done);
      });

      it('should not alter the appstate filters', function (done) {
        const filters = [
          {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          }
        ];

        appState.filters = filters;
        kibiState.getState('dashboard1')
        .then(({ filters }) => {
          expect(filters).to.have.length(3);
          expect(appState.filters).to.have.length(1);
          done();
        }).catch(done);
      });

      it('should remove duplicates', function (done) {
        const filters = [
          {
            term: { field1: 'bbb' },
            meta: { disabled: false }
          },
          {
            term: { field1: 'aaa' },
            meta: { disabled: false }
          },
          {
            term: {
              field1: 'i am pinned'
            },
            meta: {
              disabled: false
            }
          }
        ];

        appState.filters = filters;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, filters);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          expect(state1.filters).to.have.length(3);
          expect(state2.filters).to.have.length(3);
          done();
        }).catch(done);
      });

      it('should combine filters from kibistate/appstate with the pinned filters', function (done) {
        const filter1 = {
          term: { field1: 'bbb' },
          meta: { disabled: false }
        };
        const filter2 = {
          term: { field2: 'ccc' },
          meta: { disabled: false }
        };

        appState.filters = [ filter1 ];
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, [ filter2 ]);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          const rest = [
            {
              term: {
                field1: 'i am pinned'
              },
              meta: {
                disabled: false
              }
            },
            {
              term: {
                field1: 'aaa'
              },
              meta: {
                disabled: false
              }
            }
          ];
          expect(state1.filters).to.eql([ filter1, ...rest ]);
          expect(state2.filters).to.eql([ filter2, ...rest ]);
          done();
        }).catch(done);
      });

      it('should remove disabled filters', function (done) {
        const filter1 = {
          term: { field1: 'bbb' },
          meta: { disabled: false }
        };
        const filter2 = {
          term: { field2: 'ccc' },
          meta: { disabled: false }
        };

        appState.filters = [
          filter1,
          {
            term: { field1: 'ddd' },
            meta: {
              disabled: true
            }
          }
        ];
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, [
          filter2,
          {
            term: { field1: 'ddd' },
            meta: {
              disabled: true
            }
          }
        ]);
        Promise.all([ kibiState.getState('dashboard1'), kibiState.getState('dashboard2') ])
        .then(([ state1, state2 ]) => {
          const extras = [
            {
              term: {
                field1: 'i am pinned'
              },
              meta: {
                disabled: false
              }
            },
            {
              term: {
                field1: 'aaa'
              },
              meta: {
                disabled: false
              }
            }
          ];
          expect(state1.filters).to.eql([ filter1, ...extras ]);
          expect(state2.filters).to.eql([ filter2, ...extras ]);
          done();
        }).catch(done);
      });
    });

    describe('Save AppState', function () {
      beforeEach(() => init({
        pinned: [
          {
            term: { field1: 'i am pinned' },
            meta: { disabled: false }
          }
        ],
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: [
                    {
                      term: { field1: 'aaa' },
                      meta: { disabled: false }
                    }
                  ],
                  query: {
                    query_string: {
                      query: 'torrent'
                    }
                  }
                }
              )
            }
          }
        ],
        savedDashboards: [
          {
            id: 'dashboard1',
            title: 'dashboard1',
            savedSearchId: 'search1'
          }
        ]
      }));

      it('should not store in kibistate an empty array for filters', function (done) {
        appState.filters = [];
        appState.query = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };
        kibiState.saveAppState()
        .then(() => {
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.not.be.ok();
          done();
        }).catch(done);
      });

      it('should delete filters from kibi state if appState has an empty array for filters', function (done) {
        appState.filters = [];
        appState.query = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };
        kibiState._setDashboardProperty('dashboard1', kibiState._properties.filters, {term: 'should be removed'});

        kibiState.saveAppState()
        .then(() => {
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.not.be.ok();
          done();
        }).catch(done);
      });

      it('should not store in kibistate the join_set', function (done) {
        const filter1 = {
          join_set: { field1: 'bbb' },
          meta: { disabled: false }
        };

        appState.filters = [ filter1 ];
        appState.query = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };
        kibiState.saveAppState()
        .then(() => {
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.not.be.ok();
          done();
        }).catch(done);
      });

      it('should not store in kibistate the default query/time', function (done) {
        const filter1 = {
          term: { field1: 'bbb' },
          meta: { disabled: false }
        };

        appState.filters = [ filter1 ];
        appState.query = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };
        kibiState.saveAppState()
        .then(() => {
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.eql([ filter1 ]);
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.not.be.ok();
          done();
        }).catch(done);
      });

      it('should save appstate to kibistate', function (done) {
        const filter1 = {
          term: { field1: 'bbb' },
          meta: { disabled: false }
        };
        const query = {
          query_string: {
            query: 'kibi',
            analyze_wildcard: true
          }
        };
        const time = {
          mode: 'quick',
          from: 'now-500y',
          to: 'now'
        };

        appState.filters = [ filter1 ];
        appState.query = query;
        timefilter.time = time;
        kibiState.saveAppState()
        .then(() => {
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.eql([ filter1 ]);
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.query)).to.eql(query);
          expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.time)).to.eql({
            m: time.mode,
            f: time.from,
            t: time.to
          });
          done();
        }).catch(done);
      });
    });

    describe('Reset dashboards state', function () {
      beforeEach(() => init({
        savedDashboards: [
          {
            id: 'Articles',
            title: 'Articles',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({
                filter: [
                  {
                    query: {
                      query_string: {
                        query: 'torrent'
                      }
                    }
                  },
                  {
                    term: {
                      fielda: 'aaa'
                    }
                  }
                ]
              })
            }
          },
          {
            id: 'time-testing-2',
            title: 'time testing 2',
            timeRestore: true,
            timeMode: 'quick',
            timeFrom: 'now-15y',
            timeTo: 'now',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({filter:[]})
            }
          }
        ]
      }));

      it('should reset times, filters and queries to their default state on all dashboards', function (done) {
        kibiState._setDashboardProperty('Articles', kibiState._properties.filters, [
          {
            term: {
              fieldb: 'bbb'
            }
          }
        ]);
        kibiState._setDashboardProperty('Articles', kibiState._properties.query, {
          query_string: {
            query: 'web'
          }
        });
        kibiState._saveTimeForDashboardId('Articles', 'quick', 'now-15m', 'now');

        kibiState._setDashboardProperty('time-testing-2', kibiState._properties.filters, [
          {
            term: {
              fieldb: 'ccc'
            }
          }
        ]);
        kibiState._setDashboardProperty('time-testing-2', kibiState._properties.query, {
          query_string: {
            query: 'ibm'
          }
        });
        kibiState._saveTimeForDashboardId('time-testing-2', 'quick', 'now-15m', 'now');

        kibiState.resetFiltersQueriesTimes().then(() => {
          expect(kibiState._getDashboardProperty('Articles', kibiState._properties.filters)).to.eql([
            {
              term: {
                fielda: 'aaa'
              }
            }
          ]);
          expect(kibiState._getDashboardProperty('Articles', kibiState._properties.query)).to.eql({
            query_string: {
              query: 'torrent'
            }
          });
          expect(kibiState._getDashboardProperty('Articles', kibiState._properties.time)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('time-testing-2', kibiState._properties.filters)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('time-testing-2', kibiState._properties.query)).to.not.be.ok();
          expect(kibiState._getDashboardProperty('time-testing-2', kibiState._properties.time)).to.eql({
            m: 'quick',
            f: 'now-15y',
            t: 'now',
          });
          done();
        }).catch(done);
      });
    });

    describe('Join Set', function () {
      describe('Join Set Label', function () {
        beforeEach(() => init({
          indexPatterns: [
            {
              id: 'index-a',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            },
            {
              id: 'index-b',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            },
            {
              id: 'index-c',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            },
            {
              id: 'index-d',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            },
            {
              id: 'index-e',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            }
          ],
          savedDashboards: [
            {
              id: 'a',
              title: 'Dashboard A',
              savedSearchId: 'savedsearch-a'
            },
            {
              id: 'b',
              title: 'Dashboard B',
              savedSearchId: 'savedsearch-b'
            },
            {
              id: 'c',
              title: 'Dashboard C',
              savedSearchId: 'savedsearch-c'
            },
            {
              id: 'd',
              title: 'Dashboard D',
              savedSearchId: 'savedsearch-d'
            },
            {
              id: 'e',
              title: 'Dashboard E',
              savedSearchId: 'savedsearch-e'
            }
          ],
          savedSearches: [
            {
              id: 'savedsearch-a',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({ index: 'index-a' })
              }
            },
            {
              id: 'savedsearch-b',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({ index: 'index-b' })
              }
            },
            {
              id: 'savedsearch-c',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({ index: 'index-c' })
              }
            },
            {
              id: 'savedsearch-d',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({ index: 'index-d' })
              }
            },
            {
              id: 'savedsearch-e',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({ index: 'index-e' })
              }
            }
          ]
        }));

        it('should output correct join label 1', function (done) {
          var relations = [
            {
              dashboards: [ 'a', 'b' ],
              relation: 'index-a/id/index-b/id'
            },
            {
              dashboards: [ 'b', 'c' ],
              relation: 'index-b/id/index-c/id'
            },
            {
              dashboards: [ 'd', 'e' ],
              relation: 'index-d/id/index-e/id'
            }
          ];

          config.set('kibi:relationalPanel', true);
          _.each(relations, (rel) => kibiState.enableRelation(rel));

          kibiState.getState('a').then(function ({ filters }) {
            expect(filters).to.have.length(1);
            expect(filters[0].join_set).to.be.ok();
            expect(filters[0].meta.alias).to.be('Dashboard A <-> Dashboard B <-> Dashboard C');
            done();
          }).catch(done);
        });

        it('should output correct join label 2', function (done) {
          var relations = [
            {
              dashboards: [ 'a', 'b' ],
              relation: 'index-a/id/index-b/id'
            },
            {
              dashboards: [ 'b', 'c' ],
              relation: 'index-b/id/index-c/id'
            },
            {
              dashboards: [ 'c', 'd' ],
              relation: 'index-c/id/index-d/id'
            }
          ];

          config.set('kibi:relationalPanel', true);
          _.each(relations, (rel) => kibiState.enableRelation(rel));

          kibiState.getState('a').then(function ({ filters }) {
            expect(filters).to.have.length(1);
            expect(filters[0].join_set).to.be.ok();
            expect(filters[0].meta.alias).to.be('Dashboard A <-> Dashboard B <-> Dashboard C <-> Dashboard D');
            done();
          }).catch(done);
        });

        it('should output correct join label 3', function (done) {
          var relations = [
            {
              dashboards: [ 'a', 'b' ],
              relation: 'index-a/id/index-b/id'
            },
            {
              dashboards: [ 'b', 'b' ],
              relation: 'index-b/id1/index-b/id2'
            }
          ];

          config.set('kibi:relationalPanel', true);
          _.each(relations, (rel) => kibiState.enableRelation(rel));

          kibiState.getState('a').then(function ({ filters }) {
            expect(filters).to.have.length(1);
            expect(filters[0].join_set).to.be.ok();
            expect(filters[0].meta.alias).to.be('Dashboard A <-> Dashboard B');
            done();
          }).catch(done);
        });
      });

      describe('Dashboard IDs in connected component', function () {
        beforeEach(() => init({}));

        it('should return a, b but not c and d', function () {
          var relations = [
            {
              dashboards: [ 'a', 'b' ]
            },
            {
              dashboards: [ 'c', 'd' ]
            }
          ];

          const labels = kibiState._getDashboardsIdInConnectedComponent('a', relations);
          expect(labels).to.have.length(2);
          expect(labels).to.contain('a');
          expect(labels).to.contain('b');
        });

        it('should not return anything', function () {
          var relations = [
            {
              dashboards: [ 'a', 'b' ]
            }
          ];

          const labels = kibiState._getDashboardsIdInConnectedComponent('c', relations);
          expect(labels).to.have.length(0);
        });

        it('should return only a', function () {
          var relations = [
            {
              dashboards: [ 'a', 'a' ]
            }
          ];

          const labels = kibiState._getDashboardsIdInConnectedComponent('a', relations);
          expect(labels).to.have.length(1);
          expect(labels[0]).to.be('a');
        });

        it('should return a and b', function () {
          var relations = [
            {
              dashboards: [ 'a', 'b' ]
            },
            {
              dashboards: [ 'b', 'b' ]
            }
          ];

          const labels = kibiState._getDashboardsIdInConnectedComponent('a', relations);
          expect(labels).to.have.length(2);
          expect(labels).to.contain('a');
          expect(labels).to.contain('b');
        });

        it('should support multiple relations between two dashboards', function () {
          var relations = [
            {
              dashboards: [ 'a', 'b' ],
              relation: 'index-a/id1/index-b/id1'
            },
            {
              dashboards: [ 'a', 'b' ],
              relation: 'index-a/id2/index-b/id2'
            }
          ];

          const labels = kibiState._getDashboardsIdInConnectedComponent('a', relations);
          expect(labels).to.have.length(2);
          expect(labels).to.contain('a');
          expect(labels).to.contain('b');
        });
      });

      describe('Join Set Filter', function () {
        beforeEach(() => init({
          kibiEnterpriseEnabled: false,
          indexPatterns: [
            {
              id: 'index-a',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            },
            {
              id: 'index-b',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            },
            {
              id: 'index-c',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            },
            {
              id: 'index-d',
              timeFieldName: 'date',
              fields: [
                {
                  name: 'date'
                }
              ]
            }
          ],
          savedDashboards: [
            {
              id: 'dashboard-nossid',
              title: 'dashboard-nossid'
            },
            {
              id: 'dashboard-a',
              title: 'dashboard-a',
              savedSearchId: 'savedsearch-a'
            },
            {
              id: 'dashboard-b',
              title: 'dashboard-b',
              savedSearchId: 'savedsearch-b'
            },
            {
              id: 'dashboard-c',
              title: 'dashboard-c',
              savedSearchId: 'savedsearch-c'
            },
            {
              id: 'dashboard-d',
              title: 'dashboard-d',
              savedSearchId: 'savedsearch-d'
            }
          ],
          savedSearches: [
            {
              id: 'savedsearch-a',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-a',
                  filter: [],
                  query: {
                    query_string: {
                      query: 'aaa'
                    }
                  }
                })
              }
            },
            {
              id: 'savedsearch-b',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-b',
                  filter: [],
                  query: {
                    query_string: {
                      query: 'bbb'
                    }
                  }
                })
              }
            },
            {
              id: 'savedsearch-c',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-c',
                  filter: [],
                  query: {
                    query_string: {
                      query: 'ccc'
                    }
                  }
                })
              }
            },
            {
              id: 'savedsearch-d',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'index-d',
                  filter: [],
                  query: {
                    query_string: {
                      query: 'ddd'
                    }
                  }
                })
              }
            }
          ]
        }));

        it('should be disabled/enabled according to relationalPanel', function () {
          expect(kibiState.isRelationalPanelEnabled()).to.not.be.ok();
          config.set('kibi:relationalPanel', true);
          expect(kibiState.isRelationalPanelEnabled()).to.be.ok();
          config.set('kibi:relationalPanel', false);
          expect(kibiState.isRelationalPanelEnabled()).to.not.be.ok();
        });

        it('should be enabled if the plugin is installed', function () {
          expect(kibiState.isSirenJoinPluginInstalled()).to.be.ok();
        });

        it('should fail if the focused dashboard cannot be retrieved', function (done) {
          var relDash = {
            dashboards: [ 'dashboard-a', 'does-not-exist' ],
            relation: 'index-a/id/index-b/id'
          };
          config.set('kibi:relationalPanel', true);
          kibiState.enableRelation(relDash);
          kibiState.getState('does-not-exist').catch(function (err) {
            expect(err.message).to.be('Unable to retrieve dashboards: ["does-not-exist"].');
            done();
          }).catch(done);
        });

        it('should fail if the focused dashboard does not have a saved search', function (done) {
          var relDash = {
            dashboards: [ 'dashboard-a', 'dashboard-nossid' ],
            relation: 'index-a/id/index-b/id'
          };
          config.set('kibi:relationalPanel', true);
          kibiState.enableRelation(relDash);
          kibiState.getState('dashboard-nossid').catch(function (err) {
            expect(err.message).to.be('The dashboard [dashboard-nossid] is expected to be associated with a saved search.');
            done();
          }).catch(done);
        });

        it('should not build join_set filter if focused index does not have an enabled relation', function (done) {
          config.set('kibi:relationalPanel', true);
          kibiState.getState('dashboard-c').then(function ({ filters, queries, time }) {
            expect(filters).to.have.length(0);
            done();
          }).catch(done);
        });

        it('1 should build the join filter', function (done) {
          config.set('kibi:relationalPanel', true);
          var relDash = {
            dashboards: [ 'dashboard-a', 'dashboard-b' ],
            relation: 'index-a/id/index-b/id'
          };
          kibiState.enableRelation(relDash);

          kibiState.getState('dashboard-a').then(function ({ filters }) {
            expect(filters).to.have.length(1);
            expect(filters[0].join_set).to.be.ok();
            expect(filters[0].meta).to.be.ok();
            expect(filters[0].meta.alias).to.equal('dashboard-a <-> dashboard-b');
            expect(filters[0].join_set.focus).to.be('index-a');
            expect(filters[0].join_set.queries['index-a']).to.not.be.ok();
            done();
          }).catch(done);
        });

        it('2 should build the join filter with filters on dashboards', function (done) {
          // filters from the focused dashboard are not put in the filters of the join query
          kibiState._setDashboardProperty('dashboard-a', kibiState._properties.filters, [
            {
              meta: {
                disabled: false
              },
              range: {
                gte: 20,
                lte: 40
              }
            }
          ]);
          kibiState._setDashboardProperty('dashboard-b', kibiState._properties.filters, [
            {
              meta: {
                disabled: false
              },
              exists: {
                field: 'aaa'
              }
            }
          ]);
          config.set('kibi:relationalPanel', true);
          const relDash = {
            dashboards: [ 'dashboard-a', 'dashboard-b' ],
            relation: 'index-a/id/index-b/id'
          };
          kibiState.enableRelation(relDash);

          kibiState.getState('dashboard-a').then(function ({ filters }) {
            expect(filters).to.have.length(2);
            expect(filters[0]).to.be.eql({ meta: { disabled: false }, range: { gte: 20, lte: 40 } });
            expect(filters[1].join_set).to.be.ok();
            expect(filters[1].meta).to.be.ok();
            expect(filters[1].meta.alias).to.equal('dashboard-a <-> dashboard-b');
            expect(filters[1].join_set.focus).to.be('index-a');
            expect(filters[1].join_set.queries['index-a']).to.not.be.ok();
            expect(filters[1].join_set.queries['index-b']).to.have.length(3);
            expect(filters[1].join_set.queries['index-b'][0]).to.eql({ query: { query_string: { query: 'bbb' } } });
            expect(filters[1].join_set.queries['index-b'][1]).to.eql({ exists: { field: 'aaa' } });
            expect(filters[1].join_set.queries['index-b'][2]).to.eql({
              range: {
                date: {
                  gte: dateMath.parseWithPrecision(defaultStartTime, false).valueOf(),
                  lte: dateMath.parseWithPrecision(defaultEndTime, true).valueOf(),
                  format: 'epoch_millis'
                }
              }
            });
            done();
          }).catch(done);
        });

        it('should build the join filter with negated filters on dashboards', function (done) {
          // filters from the focused dashboard are not put in the filters of the join query
          kibiState._setDashboardProperty('dashboard-a', kibiState._properties.filters, [
            {
              meta: {
                disabled: false
              },
              range: {
                gte: 20,
                lte: 40
              }
            }
          ]);
          kibiState._setDashboardProperty('dashboard-b', kibiState._properties.filters, [
            {
              meta: {
                disabled: false,
                negate: true
              },
              exists: {
                field: 'aaa'
              }
            }
          ]);
          config.set('kibi:relationalPanel', true);
          const relDash = {
            dashboards: [ 'dashboard-a', 'dashboard-b' ],
            relation: 'index-a/id/index-b/id'
          };
          kibiState.enableRelation(relDash);

          kibiState.getState('dashboard-a').then(function ({ filters }) {
            expect(filters).to.have.length(2);
            expect(filters[0]).to.be.eql({ meta: { disabled: false }, range: { gte: 20, lte: 40 } });
            expect(filters[1].join_set).to.be.ok();
            expect(filters[1].meta).to.be.ok();
            expect(filters[1].meta.alias).to.equal('dashboard-a <-> dashboard-b');
            expect(filters[1].join_set.focus).to.be('index-a');
            expect(filters[1].join_set.queries['index-a']).to.not.be.ok();
            expect(filters[1].join_set.queries['index-b']).to.have.length(3);
            expect(filters[1].join_set.queries['index-b'][0]).to.eql({ query: { query_string: { query: 'bbb' } } });
            expect(filters[1].join_set.queries['index-b'][1]).to.eql({ not: { exists: { field: 'aaa' } } });
            expect(filters[1].join_set.queries['index-b'][2]).to.eql({
              range: {
                date: {
                  gte: dateMath.parseWithPrecision(defaultStartTime, false).valueOf(),
                  lte: dateMath.parseWithPrecision(defaultEndTime, true).valueOf(),
                  format: 'epoch_millis'
                }
              }
            });
            done();
          }).catch(done);
        });

        it('2 should build the join filter with queries on dashboards', function (done) {
          kibiState._setDashboardProperty('dashboard-a', kibiState._properties.query, { query_string: { query: 'aaa' } });
          kibiState._setDashboardProperty('dashboard-b', kibiState._properties.query, { query_string: { query: 'ccc' } });
          config.set('kibi:relationalPanel', true);
          const relDash = {
            dashboards: [ 'dashboard-a', 'dashboard-b' ],
            relation: 'index-a/id/index-b/id'
          };
          kibiState.enableRelation(relDash);

          kibiState.getState('dashboard-a').then(function ({ filters }) {
            expect(filters).to.have.length(1);
            expect(filters[0].join_set).to.be.ok();
            expect(filters[0].meta).to.be.ok();
            expect(filters[0].meta.alias).to.equal('dashboard-a <-> dashboard-b');
            expect(filters[0].join_set.focus).to.be('index-a');
            expect(filters[0].join_set.queries['index-a']).to.not.be.ok();
            expect(filters[0].join_set.queries['index-b']).to.have.length(3);
            // from the dashboard meta
            expect(filters[0].join_set.queries['index-b'][0]).to.eql({
              query: {
                query_string: { query: 'ccc' }
              }
            });
            // from the search meta
            expect(filters[0].join_set.queries['index-b'][1]).to.eql({
              query: {
                query_string: { query: 'bbb' }
              }
            });
            // time
            expect(filters[0].join_set.queries['index-b'][2]).to.eql({
              range: {
                date: {
                  gte: dateMath.parseWithPrecision(defaultStartTime, false).valueOf(),
                  lte: dateMath.parseWithPrecision(defaultEndTime, true).valueOf(),
                  format: 'epoch_millis'
                }
              }
            });
            done();
          }).catch(done);
        });

        it('should build the join filter with non-query_string queries', function (done) {
          const query = {
            constant_score: {
              query: {
                match: {
                  id: 'company/raavel'
                }
              }
            }
          };
          const relDash = {
            dashboards: [ 'dashboard-a', 'dashboard-b' ],
            relation: 'index-a/id/index-b/id'
          };

          kibiState._setDashboardProperty('dashboard-b', kibiState._properties.query, query);
          config.set('kibi:relationalPanel', true);
          kibiState.enableRelation(relDash);

          kibiState.getState('dashboard-a').then(function ({ filters }) {
            expect(filters).to.have.length(1);
            expect(filters[0].join_set).to.be.ok();
            expect(filters[0].meta).to.be.ok();
            expect(filters[0].meta.alias).to.equal('dashboard-a <-> dashboard-b');
            expect(filters[0].join_set.focus).to.be('index-a');
            expect(filters[0].join_set.queries['index-a']).to.not.be.ok();
            expect(filters[0].join_set.queries['index-b']).to.have.length(3);
            // from the dashboard meta
            expect(filters[0].join_set.queries['index-b'][0]).to.eql({ query: query });
            // from the search meta
            expect(filters[0].join_set.queries['index-b'][1]).to.eql({
              query: {
                query_string: { query: 'bbb' }
              }
            });
            // time
            expect(filters[0].join_set.queries['index-b'][2]).to.eql({
              range: {
                date: {
                  gte: dateMath.parseWithPrecision(defaultStartTime, false).valueOf(),
                  lte: dateMath.parseWithPrecision(defaultEndTime, true).valueOf(),
                  format: 'epoch_millis'
                }
              }
            });
            done();
          }).catch(done);
        });

        it('should build the join filter with time from connected dashboards', function (done) {
          const relDash = {
            dashboards: [ 'dashboard-a', 'dashboard-b' ],
            relation: 'index-a/id/index-b/id'
          };
          const time = {
            m: 'absolute',
            f: '2005-09-01T12:00:00.000Z',
            t: '2015-09-05T12:00:00.000Z'
          };

          kibiState._setDashboardProperty('dashboard-b', kibiState._properties.time, time);
          config.set('kibi:relationalPanel', true);
          kibiState.enableRelation(relDash);

          kibiState.getState('dashboard-a').then(function ({ filters }) {
            expect(filters).to.have.length(1);
            expect(filters[0].join_set).to.be.ok();
            expect(filters[0].meta).to.be.ok();
            expect(filters[0].meta.alias).to.equal('dashboard-a <-> dashboard-b');
            expect(filters[0].join_set.focus).to.be('index-a');
            expect(filters[0].join_set.queries['index-a']).to.not.be.ok();
            expect(filters[0].join_set.queries['index-b']).to.be.ok();
            expect(filters[0].join_set.queries['index-b']).to.have.length(2);
            expect(filters[0].join_set.queries['index-b'][0]).to.eql({
              query: {
                query_string: {
                  query: 'bbb'
                }
              }
            });
            expect(filters[0].join_set.queries['index-b'][1]).to.eql({
              range: {
                date: {
                  gte: dateMath.parseWithPrecision('2005-09-01T12:00:00.000Z', false).valueOf(),
                  lte: dateMath.parseWithPrecision('2015-09-05T12:00:00.000Z', true).valueOf(),
                  format: 'epoch_millis'
                }
              }
            });
            done();
          }).catch(done);
        });
      });
    });
  });
});



