var root = require('requirefrom')('');
var util = root('src/server/lib/sindicetech/util');
var inject = root('src/server/lib/sindicetech/inject');
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
  it('bad source path 1', function (done) {
    var query = {
      foo: 'bar',
      inject: [{
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'op',
        fieldName: 'bah'
      }]
    };
    var response = {
      responses: [{
        hits: {
          hits: [{
            _source: {
              pa: 'ahah',
              po: 'ddd'
            }
          }, {
            _source: {
              pa: 'ahah',
              po: 'ccc'
            }
          }]
        }
      }]
    };

    var savedQueries = inject.save(query);
    inject.runSavedQueries(response, queryEngine, savedQueries)
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      expect(err.message).to.match(/no property=\[op\]/i);
      done();
    });
  });

  it('value at sourcePath is null or undefined', function (done) {
    var query = {
      foo: 'bar',
      inject: [
        {
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: 'po',
          fieldName: 'bah'
        },
        {
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: 'po.po',
          fieldName: 'bah'
        }
      ]
    };
    var response = {
      responses: [
        {
          hits: {
            hits: [
              {
                _source: {
                  pa: 'aaa',
                  po: null
                }
              },
              {
                _source: {
                  pa: 'bbb',
                  po: undefined
                }
              }
            ]
          }
        },
        {
          hits: {
            hits: [
              {
                _source: {
                  pa: 'aaa',
                  po: null
                }
              },
              {
                _source: {
                  pa: 'bbb',
                  po: undefined
                }
              }
            ]
          }
        }
      ]
    };

    var savedQueries = inject.save(query);
    inject.runSavedQueries(response, queryEngine, savedQueries)
    .then(function (queries) {
      expect(queries.responses[0].hits.hits[0].fields.bah.length).to.be(0);
      expect(queries.responses[0].hits.hits[1].fields.bah.length).to.be(0);
      expect(queries.responses[1].hits.hits[0].fields.bah.length).to.be(0);
      expect(queries.responses[1].hits.hits[1].fields.bah.length).to.be(0);
      done();
    })
    .catch(function (err) {
      done(err);
    });
  });

  it('bad source path 2', function (done) {
    var query = {
      foo: 'bar',
      inject: [{
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po.op',
        fieldName: 'bah'
      }]
    };
    var response = {
      responses: [{
        hits: {
          hits: [{
            _source: {
              pa: 'ahah',
              po: {
                po: 'ddd'
              }
            }
          }, {
            _source: {
              pa: 'ahah',
              po: {
                op: 'ccc'
              }
            }
          }]
        }
      }]
    };

    var savedQueries = inject.save(query);
    inject.runSavedQueries(response, queryEngine, savedQueries)
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      expect(err.message).to.match(/no property=\[op\]/i);
      done();
    });
  });

  it('query engine fail', function (done) {
    var query = {
      foo: 'bar',
      inject: [{
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po',
        fieldName: 'bah'
      }]
    };
    var response = {
      responses: [{
        hits: {
          hits: [{
            _source: {
              pa: 'ahah',
              po: 'ddd'
            }
          }]
        }
      }]
    };
    var savedQueries = inject.save(query);
    inject.runSavedQueries(response, queryEngineError, savedQueries)
    .catch(function (err) {
      expect(err).not.to.be(undefined);
      expect(err.message).to.match(/this should fail/i);
      done();
    });
  });
});

describe('Saved custom queries for post-processing', function () {
  describe('save method', function () {
    it('save on series of queries', function (done) {
      var query1 = {
        foo: 'bar',
        inject: [{
          ham: 'ste'
        }]
      };
      var query2 = {
        foo: 'rab',
        inject: [{
          ham: 'ste'
        }]
      };
      var expected = [ { foo: 'bar' }, { foo: 'rab' } ];

      var body = JSON.stringify(query1).concat('\n', JSON.stringify(query2), '\n');
      util.getQueriesAsPromise(new buffer.Buffer(body)).map(function (query) {
        inject.save(query);
        return query;
      }).then(function (queries) {
        expect(queries).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('save and remove custom query from the ES query', function () {
      var query = {
        foo: 'bar',
        inject: [{
          ham: 'ste'
        }]
      };
      var expected = { foo: 'bar' };

      inject.save(query);
      expect(query).to.eql(expected);
    });

    it('nothing to save', function (done) {
      var query = {
        foo: 'bar'
      };

      var body = JSON.stringify(query).concat('\n');
      util.getQueriesAsPromise(new buffer.Buffer(body)).map(function (q) {
        inject.save(q);
        return q;
      }).then(function (queries) {
        expect(queries).to.eql([query]);
        done();
      }).catch(function (err) {
        done(err);
      });
    });
  });

  describe('runInject method', function () {
    it('array of objects', function (done) {
      var query = {
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po.po',
        fieldName: 'bah'
      };
      var source = {
        pa: 'ahah',
        po: [
          {
            po: 'booba'
          },
          {
            po: 'aaa'
          }
        ]
      };
      var expected = {
        key: 'bah',
        value: [
          'ste'
        ]
      };

      inject._runInject(query, queryEngine)
      .then(function (run) {
        expect(run(source)).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('array value', function (done) {
      var query = {
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po.po',
        fieldName: 'bah'
      };
      var source = {
        pa: 'ahah',
        po: {
          po: [
            'aaa',
            'booba'
          ]
        }
      };
      var expected = {
        key: 'bah',
        value: [
          'ste'
        ]
      };

      inject._runInject(query, queryEngine)
      .then(function (run) {
        expect(run(source)).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('nested source path 1', function (done) {
      var query = {
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po.po',
        fieldName: 'bah'
      };
      var source = {
        pa: 'ahah',
        po: {
          po: 'aaa'
        }
      };
      var expected = {
        key: 'bah',
        value: [
          'ste'
        ]
      };

      inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(source)).to.eql(expected);
          done();
        }).catch(function (err) {
          done(err);
        });
    });

    it('nested source path 2', function (done) {
      var query = {
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po.po.po',
        fieldName: 'bah'
      };
      var source = {
        pa: 'ahah',
        po: {
          po: {
            po: 'aaa'
          }
        }
      };
      var expected = {
        key: 'bah',
        value: [
          'ste'
        ]
      };

      inject._runInject(query, queryEngine)
      .then(function (run) {
        expect(run(source)).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
    });

    it('injects a field value with match', function (done) {
      var query = {
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po',
        fieldName: 'bah'
      };
      var source = {
        pa: 'ahah',
        po: 'aaa'
      };
      var expected = {
        key: 'bah',
        value: [
          'ste'
        ]
      };

      inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(source)).to.eql(expected);
          done();
        }).catch(function (err) {
          done(err);
        });
    });

    it('injects a field value without match', function (done) {
      var query = {
        queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
        sourcePath: 'po',
        fieldName: 'bah'
      };
      var source = {
        pa: 'ahah',
        po: 'ohoh'
      };
      var expected = {
        key: 'bah',
        value: []
      };

      inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(source)).to.eql(expected);
          done();
        }).catch(function (err) {
          done(err);
        });
    });
  });

  describe('run the saved queries', function () {
    function run(query, response, expected, done) {
      var savedQueries = inject.save(query);
      inject.runSavedQueries(response, queryEngine, savedQueries)
      .then(function (data) {
        expect(data).to.eql(expected);
        done();
      }).catch(function (err) {
        done(err);
      });
    }

    it('with two inject queries', function (done) {
      var query = {
        foo: 'bar',
        inject: [{
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: 'po',
          fieldName: 'bah'
        },
        {
          queryDefs: [ {queryId: 'ets', queryVariableName: 'variable1'} ],
          sourcePath: 'po',
          fieldName: 'hab'
        }]
      };
      var response = {
        responses: [{
          hits: {
            hits: [{
              _source: {
                pa: 'ahah',
                po: 'ddd'
              }
            }, {
              _source: {
                pa: 'ahah',
                po: 'ccc'
              }
            }]
          }
        }]
      };
      var expected = {
        responses: [{
          hits: {
            hits: [{
              fields: {
                hab: [
                  'ets'
                ],
                bah: [
                  'ste'
                ]
              },
              _source: {
                pa: 'ahah',
                po: 'ddd'
              }
            }, {
              fields: {
                bah: [],
                hab: [
                  'ets'
                ]
              },
              _source: {
                pa: 'ahah',
                po: 'ccc'
              }
            }]
          }
        }]
      };
      run(query, response, expected, done);
    });

    it('one query id', function (done) {
      var query = {
        foo: 'bar',
        inject: [{
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: 'po',
          fieldName: 'bah'
        }]
      };
      var response = {
        responses: [{
          hits: {
            hits: [{
              _source: {
                pa: 'ahah',
                po: 'ohoh'
              }
            }, {
              _source: {
                pa: 'ahah',
                po: 'aaa'
              }
            }]
          }
        }]
      };
      var expected = {
        responses: [{
          hits: {
            hits: [{
              fields: {
                bah: []
              },
              _source: {
                pa: 'ahah',
                po: 'ohoh'
              }
            }, {
              fields: {
                bah: [
                  'ste'
                ]
              },
              _source: {
                pa: 'ahah',
                po: 'aaa'
              }
            }]
          }
        }]
      };
      run(query, response, expected, done);
    });

    it('two query ids', function (done) {
      var query = {
        foo: 'bar',
        inject: [{
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'}, {queryId: 'ets', queryVariableName: 'variable1'}  ],
          sourcePath: 'po',
          fieldName: 'bah'
        }]
      };
      var response = {
        responses: [{
          hits: {
            hits: [{
              _source: {
                pa: 'ahah',
                po: 'ddd'
              }
            }, {
              _source: {
                pa: 'ahah',
                po: 'ccc'
              }
            }]
          }
        }]
      };
      var expected = {
        responses: [{
          hits: {
            hits: [{
              fields: {
                bah: [
                  'ste',
                  'ets'
                ]
              },
              _source: {
                pa: 'ahah',
                po: 'ddd'
              }
            }, {
              fields: {
                bah: [
                  'ets'
                ]
              },
              _source: {
                pa: 'ahah',
                po: 'ccc'
              }
            }]
          }
        }]
      };
      run(query, response, expected, done);
    });

    it('no query ids', function (done) {
      var query = {
        foo: 'bar',
        inject: [{
          queryDefs: [],
          sourcePath: 'po',
          fieldName: 'bah'
        }]
      };
      var response = {
        responses: [{
          hits: {
            hits: [{
              _source: {
                pa: 'ahah',
                po: 'ddd'
              }
            }, {
              _source: {
                pa: 'ahah',
                po: 'ccc'
              }
            }]
          }
        }]
      };
      var expected = {
        responses: [{
          hits: {
            hits: [{
              fields: {
                bah: [
                ]
              },
              _source: {
                pa: 'ahah',
                po: 'ddd'
              }
            }, {
              fields: {
                bah: [
                ]
              },
              _source: {
                pa: 'ahah',
                po: 'ccc'
              }
            }]
          }
        }]
      };
      run(query, response, expected, done);
    });

    it('no response', function (done) {
      var query = {
        foo: 'bar',
        inject: [{
          queryDefs: [],
          sourcePath: 'po',
          fieldName: 'bah'
        }]
      };
      var response = {};
      run(query, response, response, done);
    });
  });
});
