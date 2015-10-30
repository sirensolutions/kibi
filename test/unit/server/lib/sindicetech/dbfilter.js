var root = require('requirefrom')('');
var util = root('src/server/lib/sindicetech/util');
var dbFilter = root('src/server/lib/sindicetech/dbfilter');
var expect = require('expect.js');
var Promise = require('bluebird');
var _ = require('lodash');
var buffer = require('buffer');

/**
 * This query engine always throws an error
 */
var queryEngineError = {
  getIdsFromQueries: function (queryDefs, options) {
    return Promise.rejected(new Error('This should fail!'));
  }
};

/**
 * This query engine returns ids depending of the query id
 */
var queryEngine = {
  getIdsFromQueries: function (queryDefs, options) {
    var results = [];
    _.each(queryDefs, function (queryDef) {

      switch (queryDef.queryId) {
        case 'SteQuery':
          results.push({ ids: [ 'aaa', 'bbb', 'ccc' ], queryActivated: true });
          break;
        case 'not relevant':
          results.push({ ids: [], queryActivated: false });
          break;
        case 'ste':
          results.push({ ids: [ 'aaa', 'ddd' ], queryActivated: true });
          break;
        case 'ets':
          results.push({ ids: [ 'ccc', 'ddd' ], queryActivated: true });
          break;
        default:
          results.push({ ids: [], queryActivated: true });
      }
    });
    return Promise.all(results);
  }
};

describe('Error handling', function () {
  it('missing field in dbfilter query', function (done) {
    var query = {
      foo: 'bar',
      dbfilter: {
        queryid: 'SteQuery'
      }
    };

    dbFilter(queryEngine, query)
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      expect(err.message).to.match(/Missing queryVariableName in the dbfilter object.*/i);
      done();
    });
  });

  it('dbfilter query should be an object', function (done) {
    var query = {
      foo: 'bar',
      dbfilter: 123
    };

    dbFilter(queryEngine, query)
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      done();
    });
  });

  it('issue with the query engine', function (done) {
    var query = {
      foo: 'bar',
      dbfilter: {
        queryid: 'ste',
        queryVariableName: 'xxx',
        path: '123'
      }
    };

    dbFilter(queryEngineError, query)
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      expect(err.message).to.match(/this should fail/i);
      done();
    });
  });
});

describe('Special paths', function () {
  it('path with double quote', function (done) {
    var query = {
      foo: 'bar',
      'f"y': {
        dbfilter: {
          queryid: 'SteQuery',
          queryVariableName: 'xxx',
          path: 'ohoh',
        }
      }
    };
    var expected = {
      foo: 'bar',
      'f"y': {
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

    dbFilter(queryEngine, query)
      .then(function (data) {
        expect(data).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });
});

describe('DB Filter test', function () {
  var expectedBool = {
    should: [
      {
        terms: {
          ohoh: ['aaa', 'bbb', 'ccc']
        }
      }
    ]
  };

  it('query not activated at root', function (done) {
    var query = {
      dbfilter: {
        queryid: 'not relevant',
        queryVariableName: 'xxx',
        path: 'ahah'
      }
    };
    var expected = {};

    dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('query with no result', function (done) {
    var query = {
      dbfilter: {
        queryid: 'noresult',
        queryVariableName: 'xxx',
        path: 'ahah'
      },
      notRelevantRemove: {
        dbfilter: {
          queryid: 'not relevant',
          queryVariableName: 'xxx',
          path: 'ahah'
        }
      },
      nested: {
        notRelevantKeep: {
          foo: 'bar',
          dbfilter: {
            queryid: 'not relevant',
            queryVariableName: 'xxx',
            path: 'ahah'
          }
        }
      }
    };
    var expected = {
      bool: {
        should: [
          {
            term: {
              snxrcngu: 'tevfuxnvfpbzcyrgrylpenfl'
            }
          }
        ]
      },
      nested: {
        notRelevantKeep: {
          foo: 'bar'
        }
      }
    };

    dbFilter(queryEngine, query)
    .then(function (data) {
      expect(data).to.eql(expected);
      done();
    }).catch(function (err) {
      done(err);
    });
  });

  it('nothing to replace', function (done) {
    var query = {
      foo: 'bar'
    };

    dbFilter(queryEngine, query)
      .then(function (data) {
        expect(data).to.eql(query);
        done();
      }).catch(function (err) {
        done(err);
      });
  });

  it('entity field is optional', function (done) {
    var query = {
      foo: 'bar',
      dbfilter: {
        queryid: 'SteQuery',
        queryVariableName: 'xxx',
        path: 'ohoh'
      }
    };
    var expected = {
      foo: 'bar',
      bool: expectedBool
    };

    dbFilter(queryEngine, query)
      .then(function (data) {
        expect(data).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });

  it('replace root object', function (done) {
    var query = {
      foo: 'bar',
      dbfilter: {
        queryid: 'SteQuery',
        queryVariableName: 'xxx',
        path: 'ohoh',
        entity: ''
      }
    };
    var expected = {
      foo: 'bar',
      bool: expectedBool
    };

    dbFilter(queryEngine, query)
      .then(function (data) {
        expect(data).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });

  it('replace nested filter', function (done) {
    var query = {
      foo: 'bar',
      very: {
        deep: {
          dbfilter: {
            queryid: 'SteQuery',
            queryVariableName: 'xxx',
            path: 'ohoh',
            entity: ''
          }
        }
      }
    };
    var expected = {
      foo: 'bar',
      very: {
        deep: {
          bool: expectedBool
        }
      }
    };

    dbFilter(queryEngine, query)
      .then(function (data) {
        expect(data).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });

  it('replace multiple custom dbfilters', function (done) {
    var query = {
      dbfilter: {
        queryid: 'SteQuery',
        queryVariableName: 'xxx',
        path: 'ahah',
        entity: ''
      },
      foo: 'bar',
      very: {
        deep: {
          dbfilter: {
            queryid: 'SteQuery',
            queryVariableName: 'xxx',
            path: 'ohoh',
            entity: ''
          }
        }
      }
    };
    var expected = {
      bool: {
        should: [
          {
            terms: {
              ahah: ['aaa', 'bbb', 'ccc']
            }
          }
        ]
      },
      foo: 'bar',
      very: {
        deep: {
          bool: expectedBool
        }
      }
    };

    dbFilter(queryEngine, query)
      .then(function (data) {
        expect(data).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });
});

describe('post process hook test', function () {
  var expected = {
    foo: 'bar',
    bool: {
      should: [
        {
          terms: {
            ohoh: ['aaa', 'bbb', 'ccc']
          }
        }
      ]
    }
  };

  it('one query', function (done) {
    var query = {
      foo: 'bar',
      dbfilter: {
        queryid: 'SteQuery',
        queryVariableName: 'xxx',
        path: 'ohoh'
      }
    };

    util.getQueriesAsPromise(new buffer.Buffer(JSON.stringify(query).concat('\n')))
      .map(function (query) {
        return dbFilter(queryEngine, query);
      })
      .then(function (data) {
        expect(data.length).to.eql(1);
        expect(data[0]).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });

  it('multiple queries', function (done) {
    var query1 = {
      bar: 'foo'
    };
    var query2 = {
      foo: 'bar',
      dbfilter: {
        queryid: 'SteQuery',
        queryVariableName: 'xxx',
        path: 'ohoh',
      }
    };

    util.getQueriesAsPromise(new buffer.Buffer(JSON.stringify(query1).concat('\n', JSON.stringify(query2), '\n')))
      .map(function (query) {
        return dbFilter(queryEngine, query);
      })
      .then(function (data) {
        expect(data.length).to.eql(2);
        expect(data[0]).to.eql(query1);
        expect(data[1]).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });
});


describe('query negation', function () {

  it('simple query', function (done) {
    var query = {
      foo: 'bar',
      path: {
        dbfilter: {
          queryid: 'SteQuery',
          queryVariableName: 'xxx',
          path: 'ohoh',
          negate: true
        }
      }
    };
    var expected = {
      foo: 'bar',
      path: {
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
    };

    dbFilter(queryEngine, query)
      .then(function (data) {
        expect(data).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
  });
});

