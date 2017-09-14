import AbstractQuery from '../../queries/abstract_query';
import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed

const searchStub = sinon.stub();

searchStub.withArgs('search', sinon.match.hasOwn('q', '_id:kibi-table-handlebars'))
.returns(
  Promise.resolve({
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
  })
);
searchStub.withArgs('search', sinon.match.hasOwn('q', '_id:kibi-table-handlebars-invalid'))
.returns(
  Promise.resolve({
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
  })
);
searchStub.withArgs('search', sinon.match.hasOwn('q', '_id:kibi-lodash'))
.returns(
  Promise.resolve({
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
  })
);
searchStub.withArgs('search', sinon.match.hasOwn('q', '_id:kibi-empty'))
.returns(
  Promise.resolve({
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
  })
);

const fakeServer = {
  log: function (tags, data) {},
  config() {
    return {
      get(key) {
        if (key === 'kibana.index') {
          return '.kibi';
        }
        return '';
      }
    };
  },
  plugins: {
    elasticsearch: {
      getCluster() {
        return {
          callWithInternalUser: searchStub
        };
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
    const query = new AbstractQuery(fakeServer, {});
    expect(query.checkIfItIsRelevant).to.throwException(/Must be implemented by subclass/);
    expect(query._extractIds).to.throwException(/Must be implemented by subclass/);
    expect(query.fetchResults).to.throwException(/Must be implemented by subclass/);
    expect(query._postprocessResults).to.throwException(/Must be implemented by subclass/);
  });

  describe('._generateCacheKey', function () {

    it('should generate a cache key correctly', function () {
      const query = new AbstractQuery(fakeServer, {});
      let key = query.generateCacheKey('a', 'SELECT', false, 'id');
      expect(key).to.be('a8b661a1bbac0f0d7114a8ab18a99662129d6a707e4c29a5815be553b6ab4cf6');

      key = query.generateCacheKey(null, 'SELECT');
      expect(key).to.be('18903e24e180bee186bec000606dbaf7c51e2c06bfdc9b77f726beea02f3148e');

      key = query.generateCacheKey(undefined, 'SELECT');
      expect(key).to.be('18903e24e180bee186bec000606dbaf7c51e2c06bfdc9b77f726beea02f3148e');
    });

  });

  describe('._fetchTemplate', function () {
    it('should cache the template according to the query configuration', function () {
      const cache = new Cache();
      const query = new AbstractQuery(fakeServer, '', cache);

      return query._fetchTemplate('kibi-table-handlebars')
      .then(function (template) {
        expect(template.templateSource).to.be('Results: ({{results.bindings.length}})');
        expect(query.cache.get('kibi-table-handlebars')).to.eql(template);

        sinon.spy(cache, 'get');
        return query._fetchTemplate('kibi-table-handlebars')
        .then(function (template) {
          sinon.assert.calledOnce(cache.get);
          expect(cache.get('kibi-table-handlebars')).to.eql(template);

          sinon.assert.calledOnce(searchStub);
        });
      });
    });
  });

  describe('.getHtml', function () {
    const results = {
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

    it('should render a valid handlebars template', function () {
      const query = new AbstractQuery(fakeServer, '', null);
      const queryDef = {
        templateId: 'kibi-table-handlebars'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      return query.getHtml(queryDef, {}).then(function (result) {
        expect(result.html).to.eql('Results: (2)');
      });
    });

    it('should display a warning then rendering an invalid handlebars template', function () {
      const query = new AbstractQuery(fakeServer, '', null);
      const queryDef = {
        templateId: 'kibi-table-handlebars-invalid'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      return query.getHtml(queryDef, {}).then(function (result) {
        expect(typeof result.html).to.equal('undefined');
        expect(result.error).to.match(/Parse error/g);
      });
    });

    it('should render a warning for an unsupported template engine', function () {
      const query = new AbstractQuery(fakeServer, '', null);
      const queryDef = {
        templateId: 'kibi-lodash'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      return query.getHtml(queryDef, {}).then(function (result) {
        expect(result.html).to.match(/Unsupported template engine/);
      });
    });

  });

  describe('._extractIdsFromSql', function () {
    const rows = [
      { id: 1, label: 'ab' },
      { id: 2, label: 'ab' },
      { id: 3, label: 'cd' },
      { ID: 4, label: 'cd' }
    ];

    it('should return unique ids from the specified rows', function () {
      const query = new AbstractQuery(fakeServer, {});
      let ids = query._extractIdsFromSql(rows, 'label');
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
      const query = new AbstractQuery(fakeServer, {});
      const ids = query._extractIdsFromSql([], 'label');
      expect(ids.length).to.be(0);
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
        const query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        checkEmptySelections(query, true);
      });

      it('should return false if a selection is not required by the result query', function () {
        const query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, false);
      });

      it('should return true if a selection is required by the activation query', function () {
        const query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, true);
      });

      it('should return true if a selection is not required by the activation query but is required from the result query', function () {
        const query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        checkEmptySelections(query, true);
      });

      it('should return false if a selection is not required by the queries', function () {
        const query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, false);
      });
    });

    describe('with a selection', function () {

      const options = {
        selectedDocuments: ['abc']
      };

      it('should return false if a selection is required by the result query', function () {
        const query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the result query', function () {
        const query = new AbstractQuery(fakeServer, {
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is required by the activation query', function () {
        const query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the activation query but is required from the result query', function () {
        const query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the queries', function () {
        const query = new AbstractQuery(fakeServer, {
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });
    });
  });
});
