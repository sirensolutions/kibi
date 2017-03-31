import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'sinon';
import JdbcQuery from '../../queries/jdbc_query';

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
      datasource: {
        datasourceParams: {
          connection_string: 'connectionString',
          cache_enabled: true
        }
      },
      populateParameters: function () {
        return '';
      }
    }
  }
};

describe('JdbcQuery', function () {

  describe('correct arguments are passed to generateCacheKey', function () {

    let jdbcQuery;
    let generateCacheKeySpy;

    beforeEach(() => {
      jdbcQuery = new JdbcQuery(fakeServer, queryDefinition, cacheMock);

      // stub _init to skip initialization
      sinon.stub(jdbcQuery, '_init').returns(Promise.resolve(true));
      // stub _execute queryto skip query execution
      sinon.stub(jdbcQuery, '_executeQuery').returns(Promise.resolve({result: []}));

      generateCacheKeySpy = sinon.spy(jdbcQuery, 'generateCacheKey');
    });

    it('fetchResults', function () {
      return jdbcQuery.fetchResults({credentials: {username: 'fred'}}, false, 'variableName').then(function (res) {
        expect(res.results).to.eql({bindings: [{}]});
        sinon.assert.calledOnce(generateCacheKeySpy);
        sinon.assert.calledWithExactly(generateCacheKeySpy, 'connectionString', 'select * from x', false, 'variableName', 'fred');
      });
    });

    it('checkIfItIsRelevant', function () {
      return jdbcQuery.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.equal(Symbol.for('query should be deactivated'));
        sinon.assert.calledOnce(generateCacheKeySpy);
        sinon.assert.calledWithExactly(generateCacheKeySpy, 'connectionString', 'select * from x LIMIT 1', 'fred');
      });
    });

  });

});
