const MockState = require('fixtures/mock_state');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const Promise = require('bluebird');
const expect = require('expect.js');
const ngMock = require('ngMock');
require('ui/kibi/state_management/kibi_state');

describe('State Management', function () {
  let $location;
  let kibiState;
  let config;
  let timefilter;
  let appState;
  let globalState;

  const init = function ({ pinned, savedDashboards, savedSearches, currentPath = '/dashboard', currentDashboardId = 'dashboard1' }) {
    return function () {
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
      });

      if (savedSearches) {
        ngMock.module('discover/saved_searches', function ($provide) {
          $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', savedSearches));
        });
      }

      if (savedDashboards) {
        ngMock.module('app/dashboard', function ($provide) {
          $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
        });
      }

      ngMock.inject(function (_timefilter_, _config_, _$location_, _kibiState_) {
        timefilter = _timefilter_;
        $location = _$location_;
        kibiState = _kibiState_;
        config = _config_;
        config.set('timepicker:timeDefaults', {
          mode: 'relative',
          from: 'datea',
          to: 'dateb'
        });
      });
    };
  };

  describe('Kibi State', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    describe('URL', function () {
      beforeEach(init({}));
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
    });

    describe('Time', function () {
      beforeEach(init({}));
      it('should get correct time', function (done) {
        const options = {
          join_set: false,
          pinned: false,
          searchMeta: false
        };
        kibiState._saveTimeForDashboardId('dashboard2', 'quick', 'now-500y', 'now');
        timefilter.time = {
          mode: 'quick',
          from: 'now-15m',
          to: 'now'
        };
        Promise.all([ kibiState.getState('dashboard1', options), kibiState.getState('dashboard2', options) ])
        .then(([ state1, state2 ]) => {
          expect(state1.time.mode).to.be('quick');
          expect(state1.time.from).to.be('now-15m');
          expect(state1.time.to).to.be('now');
          expect(state2.time.mode).to.be('quick');
          expect(state2.time.from).to.be('now-500y');
          expect(state2.time.to).to.be('now');
          done();
        }).catch(done);
      });

      it('should get default time', function (done) {
        const options = {
          join_set: false,
          pinned: false,
          searchMeta: false
        };
        kibiState.getState('dashboard2', options)
        .then(({ time }) => {
          expect(time.mode).to.be('relative');
          expect(time.from).to.be('datea');
          expect(time.to).to.be('dateb');
          done();
        }).catch(done);
      });
    });

    describe('Query', function () {
      beforeEach(init({
        savedSearches: [
          {
            id: 'search1',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: [],
                  query: {
                    query: {
                      query_string: {
                        query: 'torrent'
                      }
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

      it('should get default query', function (done) {
        const options = {
          join_set: false,
          pinned: false,
          searchMeta: false
        };
        const defaultQuery = {
          query_string: {
            query: '*',
            analyze_wildcard: true
          }
        };

        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, '*');
        kibiState.getState('dashboard2', options)
        .then(({ query }) => {
          expect(query).to.eql(defaultQuery);
          done();
        }).catch(done);
      });

      it('should get query from kibistate and appstate depending on the current dashboard', function (done) {
        const options = {
          join_set: false,
          pinned: false,
          searchMeta: false
        };
        const query1 = {
          query: {
            match: {}
          }
        };
        const query2 = {
          query: {
            query_string: {}
          }
        };

        appState.query = query1;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query2);
        Promise.all([ kibiState.getState('dashboard1', options), kibiState.getState('dashboard2', options) ])
        .then(([ state1, state2 ]) => {
          expect(state1.query).to.eql(query1);
          expect(state2.query).to.eql(query2);
          done();
        }).catch(done);
      });

      it('should combine queries from the appstate/kibistate with the one from the search meta', function (done) {
        const options = {
          join_set: false,
          pinned: false,
          searchMeta: true
        };
        const query1 = {
          query: {
            query_string: {
              query: 'mobile'
            }
          }
        };
        const query2 = {
          query: {
            query_string: {
              query: 'web'
            }
          }
        };

        appState.query = query1;
        kibiState._setDashboardProperty('dashboard2', kibiState._properties.query, query2);
        Promise.all([ kibiState.getState('dashboard1', options), kibiState.getState('dashboard2', options) ])
        .then(([ state1, state2 ]) => {
          expect(state1.query).to.eql([ query1, { query: { query_string: { query: 'torrent' } } } ]);
          expect(state2.query).to.eql([ query2, { query: { query_string: { query: 'torrent' } } } ]);
          done();
        }).catch(done);
      });
    });

    describe('Filters', function () {
      beforeEach(init({
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

      it('should get filters from kibistate and appstate depending on the current dashboard', function (done) {
        const options = {
          join_set: false,
          pinned: false,
          searchMeta: false
        };
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
        Promise.all([ kibiState.getState('dashboard1', options), kibiState.getState('dashboard2', options) ])
        .then(([ state1, state2 ]) => {
          expect(state1.filters).to.eql([ filter1 ]);
          expect(state2.filters).to.eql([ filter2 ]);
          done();
        }).catch(done);
      });

      it('should combine filters from kibistate/appstate with the ones from the saved search', function (done) {
        const options = {
          join_set: false,
          pinned: false,
          searchMeta: true
        };
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
        Promise.all([ kibiState.getState('dashboard1', options), kibiState.getState('dashboard2', options) ])
        .then(([ state1, state2 ]) => {
          expect(state1.filters).to.eql([ filter1, { term: { field1: 'aaa' }, meta: { disabled: false } } ]);
          expect(state2.filters).to.eql([ filter2, { term: { field1: 'aaa' }, meta: { disabled: false } } ]);
          done();
        }).catch(done);
      });

      it('should combine filters from kibistate/appstate with the pinned filters', function (done) {
        const options = {
          join_set: false,
          pinned: true,
          searchMeta: false
        };
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
        Promise.all([ kibiState.getState('dashboard1', options), kibiState.getState('dashboard2', options) ])
        .then(([ state1, state2 ]) => {
          expect(state1.filters).to.eql([ filter1, { term: { field1: 'i am pinned' }, meta: { disabled: false } } ]);
          expect(state2.filters).to.eql([ filter2, { term: { field1: 'i am pinned' }, meta: { disabled: false } } ]);
          done();
        }).catch(done);
      });

      it('should remove disabled filters', function (done) {
        const options = {
          join_set: false,
          pinned: true,
          searchMeta: true
        };
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
        Promise.all([ kibiState.getState('dashboard1', options), kibiState.getState('dashboard2', options) ])
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
  });
});
