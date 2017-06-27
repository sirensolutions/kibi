import QueryBuilderProvider from '../query_builder';
import sinon from 'auto-release-sinon';
import _ from 'lodash';
import MockState from 'fixtures/mock_state';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { parseWithPrecision } from 'ui/kibi/utils/date_math_precision';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import noDigestPromises from 'test_utils/no_digest_promises';

const defaultStartTime = '2006-09-01T12:00:00.000Z';
const defaultEndTime = '2010-09-05T12:00:00.000Z';
let queryBuilder;
let kibiState;
let appState;
let config;

describe('Kibi Components', function () {
  describe('QueryBuilder', function () {

    function assertQuery(dashboardId, expected) {
      return kibiState.getState(dashboardId)
      .then(({ filters, queries, time }) => {
        const query = queryBuilder(filters, queries, time);
        expect(query).to.eql(expected);
      });
    }

    noDigestPromises.activateForSuite();

    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kibiEnterpriseEnabled', false);
        $provide.constant('kbnDefaultAppId', '');

        appState = new MockState({ filters: [] });
        $provide.service('getAppState', () => {
          return function () { return appState; };
        });
      });

      ngMock.module('kibana/index_patterns', function ($provide) {
        $provide.service('indexPatterns', (Promise, Private) => mockSavedObjects(Promise, Private)('indexPatterns', [
          {
            id: 'index1',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          },
          {
            id: 'index2',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'date'
              }
            ]
          }
        ]));
      });

      ngMock.module('app/dashboard', function ($provide) {
        $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboards', [
          {
            id: 'empty-dashboard',
            title: 'empty-dashboard',
            savedSearchId: 'empty saved search'
          },
          {
            id: 'query-dashboard',
            title: 'query-dashboard',
            savedSearchId: 'saved search with query'
          }
        ]));
      });

      ngMock.module('discover/saved_searches', function ($provide) {
        $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', [
          {
            id: 'empty saved search',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index1',
                  filter: [],
                  query: {
                    query_string: {
                      analyze_wildcard: true,
                      query: '*'
                    }
                  }
                }
              )
            }
          },
          {
            id: 'saved search with query',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify(
                {
                  index: 'index2',
                  filter: [],
                  query: {
                    query_string: {
                      query: 'funded_year:>2010',
                      analyze_wildcard: true
                    }
                  }
                }
              )
            }
          }
        ]));
      });

      ngMock.inject(function (Promise, _config_, timefilter, _kibiState_, Private) {
        const defaultTime = {
          mode: 'absolute',
          from: defaultStartTime,
          to: defaultEndTime
        };

        config = _config_;
        config.set('timepicker:timeDefaults', defaultTime);
        config.set('kibi:relationalPanel', false);
        timefilter.time = defaultTime;
        kibiState = _kibiState_;
        sinon.stub(kibiState, '_getCurrentDashboardId').returns('empty-dashboard');
        sinon.stub(kibiState, 'isSirenJoinPluginInstalled').returns(true);
        queryBuilder = Private(QueryBuilderProvider);
      });
    });

    const defaultQuery = {
      query_string: {
        analyze_wildcard: true,
        query: '*'
      }
    };

    it('empty', function () {
      const expected = {
        query: {
          bool: {
            must: [
              defaultQuery,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };

      return assertQuery('empty-dashboard', expected);
    });

    it('saved search', function () {
      const expected = {
        query: {
          bool: {
            must: [
              defaultQuery,
              {
                query_string: {
                  query: 'funded_year:>2010',
                  analyze_wildcard: true
                }
              },
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };

      return assertQuery('query-dashboard', expected);
    });

    it('check if filters are taken from kibiState', function () {
      const filter = {
        meta:{
          disabled: false
        },
        exists: {
          field: 'aaa'
        }
      };

      appState.filters = [ filter ];

      const expected = {
        query: {
          bool: {
            must: [
              {
                exists: {
                  field: 'aaa'
                }
              },
              defaultQuery,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };

      return assertQuery('empty-dashboard', expected);
    });

    it('check if query is taken from kibiState', function () {
      const query = {
        query_string: {
          query: 'AAA'
        }
      };

      appState.query = query;

      const expected = {
        query: {
          bool: {
            must: [
              query,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };

      return assertQuery('empty-dashboard', expected);
    });

    it('do not take filter from kibi state when disabled', function () {
      const negatedFilter = {
        meta:{
          disabled: true
        },
        term: {
          field: 'aaa'
        }
      };
      appState.filters = [ negatedFilter ];

      const expected = {
        query: {
          bool: {
            must: [
              defaultQuery,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };

      return assertQuery('empty-dashboard', expected);
    });

    it('query filter', function () {
      const query = {
        meta: { disabled: false },
        query: { query_string: { query: 'dog' } }
      };
      const expected = {
        query: {
          bool: {
            must: [
              {
                query_string: {
                  query: 'dog',
                  analyze_wildcard: true // added by the advanced setting "query:queryString:options"
                }
              },
              defaultQuery,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };

      config.set('query:queryString:options', { analyze_wildcard: true });
      appState.filters = [ query ];
      return assertQuery('empty-dashboard', expected);
    });

    it('query filter negated', function () {
      const query = {
        meta: { negate: true },
        query: { query_string: { query: 'dog' } }
      };
      const expected = {
        query: {
          bool: {
            must: [
              defaultQuery,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: [
              {
                query_string: {
                  query: 'dog',
                  analyze_wildcard: true // added by the advanced setting "query:queryString:options"
                }
              }
            ]
          }
        }
      };

      config.set('query:queryString:options', { analyze_wildcard: true });
      appState.filters = [ query ];
      return assertQuery('empty-dashboard', expected);
    });

    it('different types of filters', function () {
      const differentKindOfFilters = [
        {
          meta:{ disabled: false },
          range: {}
        },
        {
          meta:{ disabled: false },
          dbfilter: {}
        },
        {
          meta:{ disabled: false },
          or: {}
        },
        {
          meta:{ disabled: false },
          exists: {}
        },
        {
          meta:{ disabled: false },
          geo_bounding_box: {}
        },
        {
          meta:{ disabled: false },
          missing: {}
        },
        {
          meta:{ disabled: false },
          script: {}
        },
        {
          meta:{ disabled: false },
          join_sequence: {}
        }
      ];

      appState.filters = differentKindOfFilters;

      const expected = {
        query: {
          bool: {
            must: [
              ..._.map(differentKindOfFilters, f => _.omit(f, 'meta')),
              defaultQuery,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };

      return assertQuery('empty-dashboard', expected);
    });

    it('different types of filters negated', function () {
      const differentKindOfNegatedFilters = [
        {
          meta:{ negate:true },
          range: {}
        },
        {
          meta:{ negate:true },
          dbfilter: {}
        },
        {
          meta:{ negate:true },
          or: {}
        },
        {
          meta:{ negate:true },
          exists: {}
        },
        {
          meta:{ negate:true },
          geo_bounding_box: {}
        },
        {
          meta:{ negate:true },
          missing: {}
        },
        {
          meta:{ negate:true },
          script: {}
        }
      ];
      appState.filters = differentKindOfNegatedFilters;

      const expected = {
        query: {
          bool: {
            must: [
              defaultQuery,
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: _.map(differentKindOfNegatedFilters, (f) => _.omit(f, 'meta'))
          }
        }
      };

      return assertQuery('empty-dashboard', expected);
    });

    it('replace join filter if already present in appState', function () {
      appState.filters = [
        {
          meta:{ disabled: false },
          join_set: {
            indexes: [
              {
                id: 'index2'
              }
            ]
          }
        }
      ];

      config.set('kibi:relationalPanel', true);
      kibiState.enableRelation({
        dashboards: [ 'empty-dashboard', 'query-dashboard' ],
        relation: 'index1//f1/index2//f2'
      });

      sinon.stub(kibiState, '_getJoinSetFilter').returns(Promise.resolve({ join_set: 'new join set' }));
      const expected = {
        query: {
          bool: {
            must: [
              {
                join_set: 'new join set'
              },
              defaultQuery,
              {
                query_string: {
                  query: 'funded_year:>2010',
                  analyze_wildcard: true
                }
              },
              {
                range: {
                  date: {
                    gte: parseWithPrecision(defaultStartTime, false).valueOf(),
                    lte: parseWithPrecision(defaultEndTime, true).valueOf(),
                    format: 'epoch_millis'
                  }
                }
              }
            ],
            must_not: []
          }
        }
      };
      return assertQuery('query-dashboard', expected);
    });
  });
});
