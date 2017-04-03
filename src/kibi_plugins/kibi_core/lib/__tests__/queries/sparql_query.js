import { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } from '../../_symbols';
import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import SparqlQuery from '../../queries/sparql_query';

const fakeServer = {
  log: function (tags, data) {},
  config() {
    return {
      get(key) {
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
      getCluster() {
        return {
          callWithInternalUser(method, params) {
            if (method === 'search') {
              return Promise.reject(new Error('Document does not exists'));
            }
            return Promise.reject(new Error(`Unexpected method: ${method}`));
          }
        };
      }
    }
  }
};

const cacheMock = {
  get(key) { return;},
  set(key, value, time) {}
};

const queryDefinition = {
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

    it('fetchResults', function () {
      const sparqlQuery = new SparqlQuery(fakeServer, queryDefinition, cacheMock);
      // stub _execute queryto skip query execution
      sinon.stub(sparqlQuery, '_executeQuery', function () {
        return Promise.resolve({results: {bindings: [{}]}});
      });

      const generateCacheKeySpy = sinon.spy(sparqlQuery, 'generateCacheKey');

      return sparqlQuery.fetchResults({credentials: {username: 'fred'}}, false, 'variableX').then(function (res) {
        expect(res.results).to.eql({bindings: [{}]});
        sinon.assert.calledOnce(generateCacheKeySpy);
        sinon.assert.calledWithExactly(generateCacheKeySpy, 'http://localhost:9876', 'select * where {?s ?p ?o}', false, 'variableX', 'fred');
      });
    });

    it('checkIfItIsRelevant', function () {
      const sparqlQuery = new SparqlQuery(fakeServer, queryDefinition, cacheMock);
      // stub _execute queryto skip query execution
      sinon.stub(sparqlQuery, '_executeQuery').returns(Promise.resolve({results: {bindings: [{}]}}));

      const generateCacheKeySpy = sinon.spy(sparqlQuery, 'generateCacheKey');

      return sparqlQuery.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.equal(QUERY_DEACTIVATED);
        sinon.assert.calledWithExactly(generateCacheKeySpy, 'http://localhost:9876', ' select * where {?s ?p ?o} LIMIT 1', 'fred');
        expect(generateCacheKeySpy.callCount).to.equal(1);
      });
    });
  });
});
