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
  get: function (key) { return '';},
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

    it('fetchResults', function (done) {
      const jdbcQuery = new JdbcQuery(fakeServer, queryDefinition, cacheMock);

      // stub _init to skip initialization
      sinon.stub(jdbcQuery, '_init', function () {
        return Promise.resolve(true);
      });
      // stub _execute queryto skip query execution
      sinon.stub(jdbcQuery, '_executeQuery', function () {
        return Promise.resolve({result: []});
      });

      const spy = sinon.spy(jdbcQuery, 'generateCacheKey');

      jdbcQuery.fetchResults({credentials: {username: 'fred'}}, false, 'variableName').then(function (res) {
        expect(res.results).to.eql({bindings: [{}]});
        expect(spy.callCount).to.equal(1);

        expect(spy.calledWithExactly('connectionString', 'select * from x', false, 'variableName', 'fred')).to.be.ok();

        jdbcQuery._init.restore();
        jdbcQuery._executeQuery.restore();
        jdbcQuery.generateCacheKey.restore();
        done();
      }).catch(done);
    });

    it('checkIfItIsRelevant', function (done) {
      const jdbcQuery = new JdbcQuery(fakeServer, queryDefinition, cacheMock);

      // stub _init to skip initialization
      sinon.stub(jdbcQuery, '_init', function () {
        return Promise.resolve(true);
      });
      // stub _execute queryto skip query execution
      sinon.stub(jdbcQuery, '_executeQuery', function () {
        return Promise.resolve({result: []});
      });

      const spy = sinon.spy(jdbcQuery, 'generateCacheKey');

      jdbcQuery.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.equal(false);
        expect(spy.callCount).to.equal(1);

        expect(spy.calledWithExactly('connectionString', 'select * from x LIMIT 1', 'fred')).to.be.ok();

        jdbcQuery._init.restore();
        jdbcQuery._executeQuery.restore();
        jdbcQuery.generateCacheKey.restore();
        done();
      }).catch(done);
    });

  });

});
