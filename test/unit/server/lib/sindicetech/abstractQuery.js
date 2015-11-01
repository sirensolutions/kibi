var root = require('requirefrom')('');
var AbstractQuery = root('src/server/lib/sindicetech/abstractQuery');
var Promise = require('bluebird');
var expect = require('expect.js');
var mockery = require('mockery');
var sinon = require('sinon');


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


/**
 * Stores the number of calls to mocked request-promise functions.
 */
var rpCalls = 0;

/**
 * Mocks the templates endpoint response.
 */
function mockTemplatesResponse() {
  rpCalls = 0;

  mockery.enable({
    warnOnReplace: false,
    warnOnUnregistered: false,
    useCleanCache: true
  });

  var processRequest = function (rp_options, responseObject) {
    if (rp_options.transform) {
      rp_options.transform(JSON.stringify(responseObject));
    }
    return Promise.resolve(responseObject);
  };

  mockery.registerMock('request-promise', function (rp_options) {
    rpCalls++;

    if (rp_options.uri.href.match(/.+kibi-table-handlebars\/_source$/)) {
      return processRequest(rp_options, {
        title: 'kibi-table-handlebars',
        description: '',
        st_templateEngine: 'handlebars',
        st_templateSource: 'Results: ({{results.bindings.length}})'
      });
    }

    if (rp_options.uri.href.match(/.+kibi-table-handlebars-invalid\/_source$/)) {
      return processRequest(rp_options, {
        title: 'kibi-table-handlebars-invalid',
        description: '',
        st_templateEngine: 'handlebars',
        st_templateSource: 'Results: ({{{results.bindings.length}})'
      });
    }

    if (rp_options.uri.href.match(/.+kibi-lodash\/_source$/)) {
      return processRequest(rp_options, {
        title: 'kibi-lodash',
        description: '',
        st_templateEngine: 'lodash',
        st_templateSource: '<%=doe%>'
      });
    }

    if (rp_options.uri.href.match(/.+kibi-empty\/_source$/)) {
      return processRequest(rp_options, {
        title: 'kibi-lodash',
        description: '',
        st_templateEngine: 'lodash',
        st_templateSource: ''
      });
    }

    return Promise.reject();

  });
}

function disableMockery() {
  rpCalls = 0;
  mockery.disable();
  mockery.deregisterAll();
}


describe('AbstractQuery', function () {

  it('throws an error when calling methods that must be implemented by subclasses', function () {
    var query = new AbstractQuery({});
    expect(query.checkIfItIsRelevant).to.throwException(/Must be implemented by subclass/);
    expect(query._extractIds).to.throwException(/Must be implemented by subclass/);
    expect(query.fetchResults).to.throwException(/Must be implemented by subclass/);
    expect(query._postprocessResults).to.throwException(/Must be implemented by subclass/);
  });

  describe('._generateCacheKey', function () {

    it('should generate a cache key correctly', function () {
      var query = new AbstractQuery({});
      var key = query.generateCacheKey('a', 'SELECT', false, 'id');
      expect(key).to.be('a8b661a1bbac0f0d7114a8ab18a99662129d6a707e4c29a5815be553b6ab4cf6');

      key = query.generateCacheKey(null, 'SELECT');
      expect(key).to.be('18903e24e180bee186bec000606dbaf7c51e2c06bfdc9b77f726beea02f3148e');

      key = query.generateCacheKey(undefined, 'SELECT');
      expect(key).to.be('18903e24e180bee186bec000606dbaf7c51e2c06bfdc9b77f726beea02f3148e');
    });

  });

  describe('._fetchTemplate', function () {

    before(mockTemplatesResponse);

    after(disableMockery);

    it('should cache the template according to the query configuration', function (done) {
      var MockedAbstractQuery = root('src/server/lib/sindicetech/abstractQuery');

      var cache = new Cache();

      var query = new MockedAbstractQuery('', cache);

      query._fetchTemplate('kibi-table handlebars').then(function (template) {
        expect(template.st_templateSource).to.be('Results: ({{results.bindings.length}})');
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

    var MockedAbstractQuery;
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

    before(function () {
      mockTemplatesResponse();
      MockedAbstractQuery = root('src/server/lib/sindicetech/abstractQuery');
    });

    after(disableMockery);

    it('should render a valid handlebars template', function (done) {
      var query = new MockedAbstractQuery('', null);
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
      var query = new MockedAbstractQuery('', null);
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
      var query = new MockedAbstractQuery('', null);
      var queryDef = {
        templateId: 'kibi-lodash'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      query.getHtml(queryDef, {}).then(function (result) {
        expect(result.html).to.match(/Unsupported template engine/);
        done();
      }).catch(done);

    });

    it('should fail when the template source is empty', function (done) {
      var query = new MockedAbstractQuery('', null);
      var queryDef = {
        templateId: 'kibi-empty'
      };

      sinon.stub(query, 'fetchResults').returns(Promise.resolve(results));

      query.getHtml(queryDef, {}).then(function (result) {
        done('Rendered an empty template');
      }).catch(function (err) {
        expect(err).to.be('unknown template source');
        done();
      });

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
      var query = new AbstractQuery({});
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
      var query = new AbstractQuery({});
      var ids = query._extractIdsFromSql([], 'label');
      expect(ids.length).to.be(0);
    });

  });

  describe('._returnAnEmptyQueryResultsPromise', function () {

    it('should return a promise resolved with the given message', function (done) {
      var query = new AbstractQuery({});
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
        var query = new AbstractQuery({
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        checkEmptySelections(query, true);
      });

      it('should return false if a selection is not required by the result query', function () {
        var query = new AbstractQuery({
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, false);
      });

      it('should return true if a selection is required by the activation query', function () {
        var query = new AbstractQuery({
          activationQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        checkEmptySelections(query, true);
      });

      it('should return true if a selection is not required by the activation query but is required from the result query', function () {
        var query = new AbstractQuery({
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        checkEmptySelections(query, true);
      });

      it('should return false if a selection is not required by the queries', function () {
        var query = new AbstractQuery({
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
        var query = new AbstractQuery({
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the result query', function () {
        var query = new AbstractQuery({
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is required by the activation query', function () {
        var query = new AbstractQuery({
          activationQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the activation query but is required from the result query', function () {
        var query = new AbstractQuery({
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=@doc[id]@'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });

      it('should return false if a selection is not required by the queries', function () {
        var query = new AbstractQuery({
          activationQuery: 'SELECT * FROM TABLE WHERE id=10',
          resultQuery: 'SELECT * FROM TABLE WHERE id=10'
        });
        expect(query._checkIfSelectedDocumentRequiredAndNotPresent(options)).to.be(false);
      });
    });
  });
});
