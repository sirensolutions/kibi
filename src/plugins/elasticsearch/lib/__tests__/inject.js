const util = require('../util');
const inject = require('../inject');
const expect = require('expect.js');
const Promise = require('bluebird');
const _ = require('lodash');
const buffer = require('buffer');

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
  getIdsFromQueries: function (queryDefs, options) {
    const results = [];
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

describe('Kibi - Inject', function () {
  describe('Error handling', function () {
    it('value at sourcePath is null or undefined', function (done) {
      const query = {
        foo: 'bar',
        inject: [
          {
            queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
            sourcePath: [ 'po' ],
            fieldName: 'bah'
          },
          {
            queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
            sourcePath: [ 'po', 'po' ],
            fieldName: 'bah'
          }
        ]
      };
      const response = {
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

      const savedQueries = inject.save(query);
      inject.runSavedQueries(response, queryEngine, savedQueries)
      .then(function (queries) {
        expect(queries.responses[0].hits.hits[0].fields.bah).to.have.length(0);
        expect(queries.responses[0].hits.hits[1].fields.bah).to.have.length(0);
        expect(queries.responses[1].hits.hits[0].fields.bah).to.have.length(0);
        expect(queries.responses[1].hits.hits[1].fields.bah).to.have.length(0);
        done();
      })
      .catch(done);
    });

    it('query engine fail', function (done) {
      const query = {
        foo: 'bar',
        inject: [
          {
            queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
            sourcePath: [ 'po' ],
            fieldName: 'bah'
          }
        ]
      };
      const response = {
        responses: [
          {
            hits: {
              hits: [
                {
                  _source: {
                    pa: 'ahah',
                    po: 'ddd'
                  }
                }
              ]
            }
          }
        ]
      };
      const savedQueries = inject.save(query);
      inject.runSavedQueries(response, queryEngineError, savedQueries)
      .then(() => done('should fail'))
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
        const query1 = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ 'query1' ],
              sourcePath: [ 'one' ]
            }
          ]
        };
        const query2 = {
          foo: 'rab',
          inject: [
            {
              queryDefs: [ 'query2' ],
              sourcePath: [ 'two' ]
            }
          ]
        };
        const expected = [ { foo: 'bar' }, { foo: 'rab' } ];

        const body = JSON.stringify(query1).concat('\n', JSON.stringify(query2), '\n');
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
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ 'query1' ],
              sourcePath: [ 'ste' ]
            }
          ]
        };
        const expected = { foo: 'bar' };

        inject.save(query);
        expect(query).to.eql(expected);
      });

      it('nothing to save', function (done) {
        const query = {
          foo: 'bar'
        };

        const body = JSON.stringify(query).concat('\n');
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
      it('match in array', function (done) {
        const query = {
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: [ 'aaa' ],
          fieldName: 'bah'
        };
        const hit = {
          _source: {
            aaa: [ 'booba', 'aaa' ]
          }
        };
        const expected = {
          key: 'bah',
          value: [ 'ste' ]
        };

        inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
          done();
        })
        .catch(done);
      });

      it('dotted field name', function (done) {
        const query = {
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: [ 'aaa.bbb', 'ccc' ],
          fieldName: 'bah'
        };
        const hit = {
          _source: {
            'aaa.bbb': {
              ccc: [ 'booba', 'aaa' ]
            }
          }
        };
        const expected = {
          key: 'bah',
          value: [ 'ste' ]
        };

        inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
          done();
        })
        .catch(done);
      });

      it('nested path', function (done) {
        const query = {
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: [ 'po', 'po' ],
          fieldName: 'bah'
        };
        const hit = {
          _source: {
            po: {
              po: [ 'booba', 'aaa' ]
            }
          }
        };
        const expected = {
          key: 'bah',
          value: [ 'ste' ]
        };

        inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
          done();
        })
        .catch(done);
      });

      it('injects a field value with match', function (done) {
        const query = {
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: [ 'po' ],
          fieldName: 'bah'
        };
        const hit = {
          _source: {
            pa: 'ahah',
            po: 'aaa'
          }
        };
        const expected = {
          key: 'bah',
          value: [
            'ste'
          ]
        };

        inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
          done();
        })
        .catch(done);
      });

      it('injects a field value without match', function (done) {
        const query = {
          queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
          sourcePath: [ 'po' ],
          fieldName: 'bah'
        };
        const hit = {
          _source: {
            pa: 'ahah',
            po: 'ohoh'
          }
        };
        const expected = {
          key: 'bah',
          value: []
        };

        inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
          done();
        })
        .catch(done);
      });
    });

    describe('run the saved queries', function () {
      function run(query, response, expected, done) {
        const savedQueries = inject.save(query);
        inject.runSavedQueries(response, queryEngine, savedQueries)
        .then(function (data) {
          expect(data).to.eql(expected);
          done();
        }).catch(function (err) {
          done(err);
        });
      }

      it('bad source path 1', function (done) {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
              sourcePath: [ 'op' ],
              fieldName: 'bah'
            }
          ]
        };
        const response = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ccc'
                    }
                  }
                ]
              }
            }
          ]
        };

        const expected = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    fields: {
                      bah: []
                    },
                    _source: {
                      pa: 'ahah',
                      po: 'ccc'
                    }
                  }
                ]
              }
            }
          ]
        };
        run(query, response, expected, done);
      });

      it('bad source path 2', function (done) {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
              sourcePath: [ 'po', 'op' ],
              fieldName: 'bah'
            }
          ]
        };
        const response = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    _source: {
                      pa: 'ahah',
                      po: {
                        po: 'ddd'
                      }
                    }
                  },
                  {
                    _source: {
                      pa: 'ahah',
                      po: {
                        op: 'ddd'
                      }
                    }
                  }
                ]
              }
            }
          ]
        };

        const expected = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    fields: {
                      bah: []
                    },
                    _source: {
                      pa: 'ahah',
                      po: {
                        po: 'ddd'
                      }
                    }
                  },
                  {
                    fields: {
                      bah: [ 'ste' ]
                    },
                    _source: {
                      pa: 'ahah',
                      po: {
                        op: 'ddd'
                      }
                    }
                  }
                ]
              }
            }
          ]
        };
        run(query, response, expected, done);
      });

      it('with two inject queries', function (done) {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
              sourcePath: [ 'po' ],
              fieldName: 'bah'
            },
            {
              queryDefs: [ {queryId: 'ets', queryVariableName: 'variable1'} ],
              sourcePath: [ 'po' ],
              fieldName: 'hab'
            }
          ]
        };
        const response = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ddd'
                    }
                  },
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ccc'
                    }
                  }
                ]
              }
            }
          ]
        };
        const expected = {
          responses: [
            {
              hits: {
                hits: [
                  {
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
                  },
                  {
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
                  }
                ]
              }
            }
          ]
        };
        run(query, response, expected, done);
      });

      it('one query id', function (done) {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ {queryId: 'ste', queryVariableName: 'variable1'} ],
              sourcePath: [ 'po' ],
              fieldName: 'bah'
            }
          ]
        };
        const response = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ohoh'
                    }
                  },
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'aaa'
                    }
                  }
                ]
              }
            }
          ]
        };
        const expected = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    fields: {
                      bah: []
                    },
                    _source: {
                      pa: 'ahah',
                      po: 'ohoh'
                    }
                  },
                  {
                    fields: {
                      bah: [ 'ste' ]
                    },
                    _source: {
                      pa: 'ahah',
                      po: 'aaa'
                    }
                  }
                ]
              }
            }
          ]
        };
        run(query, response, expected, done);
      });

      it('two query ids', function (done) {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [
                { queryId: 'ste', queryVariableName: 'variable1' },
                { queryId: 'ets', queryVariableName: 'variable1' }
              ],
              sourcePath: [ 'po' ],
              fieldName: 'bah'
            }
          ]
        };
        const response = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ddd'
                    }
                  },
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ccc'
                    }
                  }
                ]
              }
            }
          ]
        };
        const expected = {
          responses: [
            {
              hits: {
                hits: [
                  {
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
                  },
                  {
                    fields: {
                      bah: [
                        'ets'
                      ]
                    },
                    _source: {
                      pa: 'ahah',
                      po: 'ccc'
                    }
                  }
                ]
              }
            }
          ]
        };
        run(query, response, expected, done);
      });

      it('no query ids', function (done) {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [],
              sourcePath: [ 'po' ],
              fieldName: 'bah'
            }
          ]
        };
        const response = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ddd'
                    }
                  },
                  {
                    _source: {
                      pa: 'ahah',
                      po: 'ccc'
                    }
                  }
                ]
              }
            }
          ]
        };
        const expected = {
          responses: [
            {
              hits: {
                hits: [
                  {
                    fields: {},
                    _source: {
                      pa: 'ahah',
                      po: 'ddd'
                    }
                  },
                  {
                    fields: {},
                    _source: {
                      pa: 'ahah',
                      po: 'ccc'
                    }
                  }
                ]
              }
            }
          ]
        };
        run(query, response, expected, done);
      });

      it('no response', function (done) {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [],
              sourcePath: [ 'po' ],
              fieldName: 'bah'
            }
          ]
        };
        const response = {};
        run(query, response, response, done);
      });
    });
  });
});
