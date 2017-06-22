import util from '../util';
import dbFilter from '../dbfilter';
import expect from 'expect.js';
import Promise from 'bluebird';
import _ from 'lodash';
import buffer from 'buffer';

/**
 * This query engine always throws an error
 */
const queryEngineError = {
  getIdsFromQueries: function (queryDefs, options) {
    return Promise.reject(new Error('This should fail!'));
  }
};

/**
 * This query engine returns ids depending of the query id
 */
const queryEngine = {
  getIdsFromQueries(queryDefs, options) {
    const results = _.map(queryDefs, function (queryDef) {
      switch (queryDef.queryId) {
        case 'SteQuery':
          return {
            queryId: queryDef.queryId,
            label: `Label of ${queryDef.queryId}`,
            ids: [ 'aaa', 'bbb', 'ccc' ],
            queryActivated: true
          };
        case 'not relevant':
          return {
            queryId: queryDef.queryId,
            label: `Label of ${queryDef.queryId}`,
            ids: [],
            queryActivated: false
          };
        case 'ste':
          return {
            queryId: queryDef.queryId,
            label: `Label of ${queryDef.queryId}`,
            ids: [ 'aaa', 'ddd' ],
            queryActivated: true
          };
        case 'ets':
          return {
            queryId: queryDef.queryId,
            label: `Label of ${queryDef.queryId}`,
            ids: [ 'ccc', 'ddd' ],
            queryActivated: true
          };
        default:
          return {
            queryId: queryDef.queryId,
            label: `Label of ${queryDef.queryId}`,
            ids: [],
            queryActivated: true
          };
      }
    });
    return Promise.resolve(results);
  }
};

describe('Error handling', function () {
  it('missing field in dbfilter query', function (done) {
    const query = {
      foo: 'bar',
      dbfilter: {
        queryid: 'SteQuery'
      }
    };

    dbFilter(queryEngine, query)
    .then(() => done(new Error('should fail')))
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      expect(err.message).to.match(/Missing queryVariableName in the dbfilter object.*/i);
      done();
    });
  });

  it('dbfilter query should be an object', function (done) {
    const query = {
      foo: 'bar',
      dbfilter: 123
    };

    dbFilter(queryEngine, query)
    .then(() => done(new Error('should fail')))
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      done();
    });
  });

  it('issue with the query engine', function (done) {
    const query = {
      foo: 'bar',
      dbfilter: {
        queryid: 'ste',
        queryVariableName: 'xxx',
        path: '123'
      }
    };

    dbFilter(queryEngineError, query)
    .then(() => done(new Error('should fail')))
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      expect(err.message).to.match(/this should fail/i);
      done();
    });
  });
});

describe('Special paths', function () {
  it('path with double quote', function () {
    const query = {
      foo: 'bar',
      'f"y': {
        SteQuery: {
          dbfilter: {
            queryid: 'SteQuery',
            queryVariableName: 'xxx',
            path: 'ohoh',
          }
        }
      }
    };
    const expected = {
      foo: 'bar',
      'f"y': {
        'SteQuery - Label of SteQuery': {
          bool: {
            should: [
              {
                terms: {
                  ohoh: ['aaa', 'bbb', 'ccc']
                }
              }
            ]
          }
        }
      }
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });
});

describe('DB Filter test', function () {
  const expectedBool = {
    should: [
      {
        terms: {
          ohoh: ['aaa', 'bbb', 'ccc']
        }
      }
    ]
  };

  it('query not activated at root', function () {
    const query = {
      'not relevant': {
        dbfilter: {
          queryid: 'not relevant',
          queryVariableName: 'xxx',
          path: 'ahah'
        }
      }
    };
    const expected = {
      'not relevant - Label of not relevant': {
        bool: {
          should: [
            {
              term: {
                snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
              }
            }
          ]
        }
      }
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });

  it('query with no result', function () {
    const query = {
      noresult: {
        dbfilter: {
          queryid: 'noresult',
          queryVariableName: 'xxx',
          path: 'ahah'
        }
      },
      nested: {
        notRelevantKeep: {
          foo: 'bar',
          'not relevant': {
            dbfilter: {
              queryid: 'not relevant',
              queryVariableName: 'xxx',
              path: 'ahah'
            }
          }
        }
      }
    };
    const expected = {
      'noresult - Label of noresult': {
        bool: {
          should: [
            {
              term: {
                snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
              }
            }
          ]
        }
      },
      nested: {
        notRelevantKeep: {
          foo: 'bar',
          'not relevant - Label of not relevant': {
            bool: {
              should: [
                {
                  term: {
                    snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
                  }
                }
              ]
            }
          }
        }
      }
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });

  it('nothing to replace', function () {
    const query = {
      foo: 'bar'
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(query);
    });
  });

  it('entity field is optional', function () {
    const query = {
      foo: 'bar',
      SteQuery: {
        dbfilter: {
          queryid: 'SteQuery',
          queryVariableName: 'xxx',
          path: 'ohoh'
        }
      }
    };
    const expected = {
      foo: 'bar',
      'SteQuery - Label of SteQuery': {
        bool: expectedBool
      }
    };

    dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });

  it('replace root object', function () {
    const query = {
      foo: 'bar',
      SteQuery: {
        dbfilter: {
          queryid: 'SteQuery',
          queryVariableName: 'xxx',
          path: 'ohoh',
          entity: ''
        }
      }
    };
    const expected = {
      foo: 'bar',
      'SteQuery - Label of SteQuery': {
        bool: expectedBool
      }
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });

  it('replace nested filter', function () {
    const query = {
      foo: 'bar',
      very: {
        deep: {
          SteQuery: {
            dbfilter: {
              queryid: 'SteQuery',
              queryVariableName: 'xxx',
              path: 'ohoh',
              entity: ''
            }
          }
        }
      }
    };
    const expected = {
      foo: 'bar',
      very: {
        deep: {
          'SteQuery - Label of SteQuery': {
            bool: expectedBool
          }
        }
      }
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });

  it('replace multiple custom dbfilters', function () {
    const query = {
      SteQuery: {
        dbfilter: {
          queryid: 'SteQuery',
          queryVariableName: 'xxx',
          path: 'ahah',
          entity: ''
        }
      },
      foo: 'bar',
      very: {
        deep: {
          SteQuery: {
            dbfilter: {
              queryid: 'SteQuery',
              queryVariableName: 'xxx',
              path: 'ohoh',
              entity: ''
            }
          }
        }
      }
    };
    const expected = {
      'SteQuery - Label of SteQuery': {
        bool: {
          should: [
            {
              terms: {
                ahah: ['aaa', 'bbb', 'ccc']
              }
            }
          ]
        }
      },
      foo: 'bar',
      very: {
        deep: {
          'SteQuery - Label of SteQuery': {
            bool: expectedBool
          }
        }
      }
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });
});

describe('post process hook test', function () {
  const expected = {
    foo: 'bar',
    'SteQuery - Label of SteQuery': {
      bool: {
        should: [
          {
            terms: {
              ohoh: ['aaa', 'bbb', 'ccc']
            }
          }
        ]
      }
    }
  };

  it('one query', function () {
    const query = {
      foo: 'bar',
      SteQuery: {
        dbfilter: {
          queryid: 'SteQuery',
          queryVariableName: 'xxx',
          path: 'ohoh'
        }
      }
    };

    return util.getQueriesAsPromise(new buffer.Buffer(JSON.stringify(query).concat('\n')))
    .map(function (query) {
      return dbFilter(queryEngine, query);
    })
    .then(function (data) {
      expect(data.length).to.eql(1);
      expect(data[0]).to.eql(expected);
    });
  });

  it('multiple queries', function () {
    const query1 = {
      bar: 'foo'
    };
    const query2 = {
      foo: 'bar',
      SteQuery: {
        dbfilter: {
          queryid: 'SteQuery',
          queryVariableName: 'xxx',
          path: 'ohoh',
        }
      }
    };

    return util.getQueriesAsPromise(new buffer.Buffer(JSON.stringify(query1).concat('\n', JSON.stringify(query2), '\n')))
    .map(function (query) {
      return dbFilter(queryEngine, query);
    })
    .then(function (data) {
      expect(data.length).to.eql(2);
      expect(data[0]).to.eql(query1);
      expect(data[1]).to.eql(expected);
    });
  });
});


describe('query negation', function () {

  it('empty ids negate true', function () {
    const query = {
      foo: 'bar',
      path: {
        'NOT emptyIdsQuery': {
          dbfilter: {
            queryid: 'emptyIdsQuery',
            queryVariableName: 'xxx',
            path: 'ohoh',
            negate: true
          }
        }
      }
    };
    const expected = {
      foo: 'bar',
      path: {
        'NOT emptyIdsQuery - Label of emptyIdsQuery': {
          bool: {
            must_not: [
              {
                term: {
                  snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
                }
              }
            ]
          }
        }
      }
    };

    return dbFilter(queryEngine, query).then(function (data) {
      expect(data).to.eql(expected);
    });
  });

  it('empty ids negate false', function () {
    const query = {
      foo: 'bar',
      path: {
        emptyIdsQuery: {
          dbfilter: {
            queryid: 'emptyIdsQuery',
            queryVariableName: 'xxx',
            path: 'ohoh',
            negate: false
          }
        }
      }
    };
    const expected = {
      foo: 'bar',
      path: {
        'emptyIdsQuery - Label of emptyIdsQuery': {
          bool: {
            should: [
              {
                term: {
                  snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
                }
              }
            ]
          }
        }
      }
    };

    return dbFilter(queryEngine, query).then(function (data) {
      expect(data).to.eql(expected);
    });
  });

  it('simple query', function () {
    const query = {
      foo: 'bar',
      path: {
        'NOT SteQuery': {
          dbfilter: {
            queryid: 'SteQuery',
            queryVariableName: 'xxx',
            path: 'ohoh',
            negate: true
          }
        }
      }
    };
    const expected = {
      foo: 'bar',
      path: {
        'NOT SteQuery - Label of SteQuery': {
          bool: {
            must_not: [
              {
                terms: {
                  ohoh: ['aaa', 'bbb', 'ccc']
                }
              }
            ]
          }
        }
      }
    };

    return dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
    });
  });
});
