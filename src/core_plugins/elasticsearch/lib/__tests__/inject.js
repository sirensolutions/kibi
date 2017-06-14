import util from '../util';
import inject from '../inject';
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

describe('Kibi - Inject', function () {
  describe('Error handling', function () {
    it('value at sourcePath is null or undefined', function () {
      const query = {
        foo: 'bar',
        inject: [
          {
            queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
            sourcePath: [ 'po' ],
            fieldName: 'bah'
          },
          {
            queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
      return inject.runSavedQueries(response, queryEngine, savedQueries)
      .then(function (queries) {
        expect(queries.responses[0].hits.hits[0].fields.bah).to.have.length(0);
        expect(queries.responses[0].hits.hits[1].fields.bah).to.have.length(0);
        expect(queries.responses[1].hits.hits[0].fields.bah).to.have.length(0);
        expect(queries.responses[1].hits.hits[1].fields.bah).to.have.length(0);
      });
    });

    it('query engine fail', function (done) {
      const query = {
        foo: 'bar',
        inject: [
          {
            queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
      it('save on series of queries', function () {
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
        return util.getQueriesAsPromise(new buffer.Buffer(body)).map(function (query) {
          inject.save(query);
          return query;
        }).then(function (queries) {
          expect(queries).to.eql(expected);
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

      it('nothing to save', function () {
        const query = {
          foo: 'bar'
        };

        const body = JSON.stringify(query).concat('\n');
        return util.getQueriesAsPromise(new buffer.Buffer(body)).map(function (q) {
          inject.save(q);
          return q;
        }).then(function (queries) {
          expect(queries).to.eql([query]);
        });
      });
    });

    describe('runInject method', function () {
      it('match in array', function () {
        const query = {
          queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
          value: [ 'Label of ste' ]
        };

        return inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
        });
      });

      it('dotted field name', function () {
        const query = {
          queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
          value: [ 'Label of ste' ]
        };

        return inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
        });
      });

      it('nested path', function () {
        const query = {
          queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
          value: [ 'Label of ste' ]
        };

        return inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
        });
      });

      it('injects a field value with match', function () {
        const query = {
          queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
            'Label of ste'
          ]
        };

        return inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
        });
      });

      it('injects a field value without match', function () {
        const query = {
          queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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

        return inject._runInject(query, queryEngine)
        .then(function (run) {
          expect(run(hit)).to.eql(expected);
        });
      });
    });

    describe('run the saved queries', function () {
      function run(query, response, expected) {
        const savedQueries = inject.save(query);
        return inject.runSavedQueries(response, queryEngine, savedQueries)
        .then(function (data) {
          expect(data).to.eql(expected);
        });
      }

      it('bad source path 1', function () {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
        return run(query, response, expected);
      });

      it('bad source path 2', function () {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
                      bah: [ 'Label of ste' ]
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
        return run(query, response, expected);
      });

      it('with two inject queries', function () {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
              sourcePath: [ 'po' ],
              fieldName: 'bah'
            },
            {
              queryDefs: [ { queryId: 'ets', queryVariableName: 'variable1' } ],
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
                        'Label of ets'
                      ],
                      bah: [
                        'Label of ste'
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
                        'Label of ets'
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
        return run(query, response, expected);
      });

      it('one query id', function () {
        const query = {
          foo: 'bar',
          inject: [
            {
              queryDefs: [ { queryId: 'ste', queryVariableName: 'variable1' } ],
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
                      bah: [ 'Label of ste' ]
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
        return run(query, response, expected);
      });

      it('two query ids', function () {
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
                        'Label of ste',
                        'Label of ets'
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
                        'Label of ets'
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
        return run(query, response, expected);
      });

      it('no query ids', function () {
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
        return run(query, response, expected);
      });

      it('no response', function () {
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
        return run(query, response, response);
      });
    });
  });
});
