var AbstractQuery = require('../../queries/abstract_query');
var Promise = require('bluebird');
var expect = require('expect.js');
var sinon = require('sinon');

/**
 * Stores the number of calls to mocked elasticsearch client functions
 */
var rpCalls = 0;

var fakeServer = {
  log: function (tags, data) {},
  config: function () {
    return {
      get: function (key) {
        if (key === 'kibana.index') {
          return '.kibi';
        } else {
          return '';
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      client: {
        search: function (options) {
          rpCalls++;

          switch (options.q) {
            case '_id:kibi-table-handlebars':
              return Promise.resolve({
                hits: {
                  hits: [
                    {
                      _source: {
                        title: 'kibi-table-handlebars',
                        description: '',
                        templateEngine: 'handlebars',
                        templateSource: 'Results: ({{results.bindings.length}})'
                      }
                    }
                  ]
                }
              });
            case '_id:kibi-table-handlebars-invalid':
              return Promise.resolve({
                hits: {
                  hits: [
                    {
                      _source: {
                        title: 'kibi-table-handlebars-invalid',
                        description: '',
                        templateEngine: 'handlebars',
                        templateSource: 'Results: ({{{results.bindings.length}})'
                      }
                    }
                  ]
                }
              });
            case '_id:kibi-lodash':
              return Promise.resolve({
                hits: {
                  hits: [
                    {
                      _source: {
                        title: 'kibi-lodash',
                        description: '',
                        templateEngine: 'lodash',
                        templateSource: '<%=doe%>'
                      }
                    }
                  ]
                }
              });
            case '_id:kibi-empty':
              return Promise.resolve({
                hits: {
                  hits: [
                    {
                      _source: {
                        title: 'kibi-lodash',
                        description: '',
                        templateEngine: 'lodash',
                        templateSource: ''
                      }
                    }
                  ]
                }
              });
          }
          return Promise.reject();
        }
      }
    }
  }
};

/**
 * Cache mock.
 */
function Cache() {
  this.data = {};
}
Cache.prototype.set = function (key, value) {
  this.data[key] = value;
};
Cache.prototype.get = function (key) {
  return this.data[key];
};

describe('AbstractQuery', function () {

  it('throws an error when calling methods that must be implemented by subclasses', function () {
    var query = new AbstractQuery(fakeServer, {});
    expect(query.checkIfItIsRelevant).to.throwException(/Must be implemented by subclass/);
    expect(query._extractIds).to.throwException(/Must be implemented by subclass/);
    expect(query.fetchResults).to.throwException(/Must be implemented by subclass/);
    expect(query._postprocessResults).to.throwException(/Must be implemented by subclass/);
  });

  describe('._generateCacheKey', function () {

    it('should generate a cache key correctly', function () {
      var query = new AbstractQuery(fakeServer, {});
      var key = query.generateCacheKey('a', 'SELECT', false, 'id');
      expect(key).to.be('a8b661a1bbac0f0d7114a8ab18a99662129d6a707e4c29a5815be553b6ab4cf6');

      key = query.generateCacheKey(null, 'SELECT');
      expect(key).to.be('18903e24e180bee186bec000606dbaf7c51e2c06bfdc9b77f726beea02f3148e');

      key = query.generateCacheKey(undefined, 'SELECT');
      expect(key).to.be('18903e24e180bee186bec000606dbaf7c51e2c06bfdc9b77f726beea02f3148e');
    });

  });

  describe('._fetchTemplate', function () {

    after(function () {
      rpCalls = 0;
    });

    it('should cache the template according to the query configuration', function (done) {
      var cache = new Cache();
      var query = new AbstractQuery(fakeServer, '', cache);

      query._fetchTemplate('kibi-table handlebars').then(function (template) {
        expect(template.templateSource).to.be('Results: ({{results.bindings.length}})');
        expect(query.cache.get('kibi-table-handlebars')).to.eql(template);

        sinon.spy(cache, 'get');
        query._fetchTemplate('kibi-table handlebars').then(function (template) {

          expect(cache.get.calledOnce).to.be(true);
          expect(cache.get('kibi-table-handlebars')).to.eql(template);

          expect(rpCalls).to.equal(1);

          done();
        });
      }).catch(done);
    });

  });

  describe('.getHtml', function () {
    var results = {
      head: {
        vars: []
      },
      config: {
        label: '',
        esFieldName: undefined
      },
      ids: [],
      results: {
        bindings: [
          {
            'id': {
              'type': 'unknown',
              'value': '1'
            },
            'label': {
              'type': 'unknown',
              'value': 'RDA'
            }
          },
          {
            'id': {
              'type': 'unknown',
              'value': '2'
            },
            'label': {
              'type': 'unknown',
              'value': 'RTA'
            }
          }
        ]
      }
    };

    it('should render a valid handlebars template', function (done) {
      var query = new AbstractQuery(fakeServer, '', null);
      var queryDef = {
        templateId: 'kibi-table-handlebars'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      query.getHtml(queryDef, {}).then(function (result) {
        expect(result.html).to.eql('Results: (2)');
        done();
      }).catch(done);

    });

    it('should display a warning then rendering an invalid handlebars template', function (done) {
      var query = new AbstractQuery(fakeServer, '', null);
      var queryDef = {
        templateId: 'kibi-table-handlebars-invalid'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      query.getHtml(queryDef, {}).then(function (result) {
        expect(typeof result.html).to.equal('undefined');
        expect(result.error).to.match(/Parse error/g);
        done();
      }).catch(done);

    });

    it('should render a warning for an unsupported template engine', function (done) {
      var query = new AbstractQuery(fakeServer, '', null);
      var queryDef = {
        templateId: 'kibi-lodash'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      query.getHtml(queryDef, {}).then(function (result) {
        expect(result.html).to.match(/Unsupported template engine/);
        done();
      }).catch(done);

    });

  });

  describe('._extractIdsFromSql', function () {

    var rows = [
      {'id': 1, 'label': 'ab'},
      {'id': 2, 'label': 'ab'},
      {'id': 3, 'label': 'cd'},
      {'ID': 4, 'label': 'cd'}
    ];

    it('should return unique ids from the specified rows', function () {
      var query = new AbstractQuery(fakeServer, {});
      var ids = query._extractIdsFromSql(rows, 'label');
      expect(ids).to.eql(['ab', 'cd']);

      ids = query._extractIdsFromSql(rows, 'document.label');
      expect(ids).to.eql(['ab', 'cd']);

      ids = query._extractIdsFromSql(rows, 'id');
      expect(ids).to.eql([1, 2, 3, 4]);

      ids = query._extractIdsFromSql(rows, 'Id');
      expect(ids).to.eql([1, 2, 3, 4]);

      ids = query._extractIdsFromSql(rows, 'ID');
      expect(ids).to.eql([1, 2, 3, 4]);

      ids = query._extractIdsFromSql(rows, 'doc.id');
      expect(ids).to.eql([1, 2, 3, 4]);

      ids = query._extractIdsFromSql(rows, 'doc.Id');
      expect(ids).to.eql([1, 2, 3, 4]);

      ids = query._extractIdsFromSql(rows, 'doc.ID');
      expect(ids).to.eql([1, 2, 3, 4]);
    });

    it('should return an empty array if no rows are specified', function () {
      var query = new AbstractQuery(fakeServer, {});
      var ids = query._extractIdsFromSql([], 'label');
      expect(ids.length).to.be(0);
    });

  });

  describe('._returnAnEmptyQueryResultsPromise', function () {

    it('should return a promise resolved with the given message', function (done) {
      var query = new AbstractQuery(fakeServer, {});
      query._returnAnEmptyQueryResultsPromise('test message').then(function (value) {
        expect(value).to.eql({
          head: {
            vars: []
          },
          config: {
            label: '',
            esFieldName: undefined
          },
          ids: [],
          results: {
            bindings: []
          },
          warning: 'test message'
        });
        done();
      }).catch(done);
    });

  });

  describe('._checkIfSelectedDocumentRequiredAndNotPresent', function () {

    describe('with empty selections', function () {

      function checkEmptySelections(query, expected) {
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(null)).to.be(expected);
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent({})).to.be(expected);
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent({
          selectedDocuments: null
        })).to.be(expected);
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent({
          selectedDocuments: undefined
        })).to.be(expected);
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent({
          selectedDocuments: []
        })).to.be(expected);
      }

      it('should return true if a selection is required by the result query', function () {
        var query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        checkEmptySelections(query, true);
      });

      it('should return false if a selection is not required by the result query', function () {
        var query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, false);
      });

      it('should return true if a selection is required by the activation query', function () {
        var query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, true);
      });

      it('should return true if a selection is not required by the activation query but is required from the result query', function () {
        var query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        checkEmptySelections(query, true);
      });

      it('should return false if a selection is not required by the queries', function () {
        var query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, false);
      });
    });

    describe('with a selection', function () {

      var options = {
        selectedDocuments: ['abc']
      };

      it('should return false if a selection is required by the result query', function () {
        var query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the result query', function () {
        var query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is required by the activation query', function () {
        var query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the activation query but is required from the result query', function () {
        var query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the queries', function () {
        var query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });
    });
  });
});
