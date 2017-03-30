var { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } = require('../../_symbols');
var Promise = require('bluebird');
var expect = require('expect.js');
var sinon = require('sinon');
var SparqlQuery = require('../../queries/sparql_query');

var fakeServer = {
  log: function (tags, data) {},
  config: function () {
    return {
      get: function (key) {
        if (key === 'elasticsearch.url') {
          return 'http://localhost:12345';
        } else if (key === 'kibana.index') {
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
        search: function () {
          return Promise.reject(new Error('Document does not exists'));
        }
      }
    }
  }
};

const cacheMock = {
  get(key) { return;},
  set(key, value, time) {}
};

var queryDefinition = {
  resultQuery: 'select * where {?s ?p ?o}',
  activationQuery: 'select * where {?s ?p ?o} LIMIT 1',
  datasource: {
    datasourceClazz: {
      getConnectionString: function () { return 'connectionString';},
      datasource: {
        datasourceParams: {
          cache_enabled: true,
          endpoint_url: 'http://localhost:9876',
        }
      },
      populateParameters: function () {
        return '';
      }
    }
  }
};

describe('SparqlQuery', function () {

  describe('correct arguments are passed to generateCacheKey', function () {

    it('fetchResults', function (done) {
      var sparqlQuery = new SparqlQuery(fakeServer, queryDefinition, cacheMock);
      // stub _execute queryto skip query execution
      sinon.stub(sparqlQuery, '_executeQuery', function () {
        return Promise.resolve({results: {bindings: [{}]}});
      });

      var spy = sinon.spy(sparqlQuery, 'generateCacheKey');

      sparqlQuery.fetchResults({credentials: {username: 'fred'}}, false, 'variableX').then(function (res) {
        expect(res.results).to.eql({bindings: [{}]});
        expect(spy.callCount).to.equal(1);

        expect(spy.calledWithExactly('http://localhost:9876', 'select * where {?s ?p ?o}', false, 'variableX', 'fred')).to.be.ok();

        sparqlQuery._executeQuery.restore();
        sparqlQuery.generateCacheKey.restore();
        done();
      }).catch(done);
    });

    it('checkIfItIsRelevant', function (done) {
      var sparqlQuery = new SparqlQuery(fakeServer, queryDefinition, cacheMock);
      // stub _execute queryto skip query execution
      sinon.stub(sparqlQuery, '_executeQuery', function () {
        return Promise.resolve({results: {bindings: [{}]}});
      });

      var spy = sinon.spy(sparqlQuery, 'generateCacheKey');

      sparqlQuery.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.equal(QUERY_DEACTIVATED);
        expect(spy.callCount).to.equal(1);

        expect(spy.calledWithExactly('http://localhost:9876', ' select * where {?s ?p ?o} LIMIT 1', 'fred')).to.be.ok();

        sparqlQuery._executeQuery.restore();
        sparqlQuery.generateCacheKey.restore();
        done();
      }).catch(done);
    });
  });
});
