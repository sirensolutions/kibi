import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import PostgresQuery from '../../queries/postgres_query';

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
  get: function (key) { return; },
  set: function (key, value, time) {}
};

const queryDefinition = {
  activationQuery: 'select * from x LIMIT 1',
  resultQuery: 'select * from x',
  datasource: {
    datasourceClazz: {
      getConnectionString: function () { return 'connectionString';},
      datasource: {
        datasourceParams: {
          cache_enabled: true,
          host: 'localhost',
          dbname: 'mydb'
        }
      },
      populateParameters: function () {
        return '';
      }
    }
  }
};

describe('PostgresQuery', function () {

  describe('correct arguments are passed to generateCacheKey', function () {

    it('fetchResults', function () {
      const postgresQuery = new PostgresQuery(fakeServer, queryDefinition, cacheMock);
      // stub _execute queryto skip query execution
      sinon.stub(postgresQuery, '_executeQuery', function () {
        return Promise.resolve({fields: [], rows: []});
      });

      const generateCacheKeySpy = sinon.spy(postgresQuery, 'generateCacheKey');

      return postgresQuery.fetchResults({credentials: {username: 'fred'}}, false, 'variableX').then(function (res) {
        expect(res.results).to.eql({ bindings: []});
        sinon.assert.calledOnce(generateCacheKeySpy);
        sinon.assert.calledWithExactly(generateCacheKeySpy, 'localhostmydb', 'select * from x', false, 'variableX', 'fred');
      });
    });

    it('checkIfItIsRelevant', function () {
      const postgresQuery = new PostgresQuery(fakeServer, queryDefinition, cacheMock);
      // stub _execute queryto skip query execution
      sinon.stub(postgresQuery, '_executeQuery').returns(Promise.resolve({fields: [], rows: []}));

      const generateCacheKeySpy = sinon.spy(postgresQuery, 'generateCacheKey');

      return postgresQuery.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.equal(Symbol.for('query should be deactivated'));
        sinon.assert.calledOnce(generateCacheKeySpy);
        sinon.assert.calledWithExactly(generateCacheKeySpy, 'localhostmydb', 'select * from x LIMIT 1', 'fred');
      });
    });

  });

});
