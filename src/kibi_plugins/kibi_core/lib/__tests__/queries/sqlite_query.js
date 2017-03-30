import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'sinon';
import SqliteQuery from '../../queries/sqlite_query';

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

describe('SqliteQuery', function () {

  describe('fetchResults test if correct arguments are passed to generateCacheKey', function () {
    it('simple query', function (done) {

      const cacheMock = {
        get: function (key) { return '';},
        set: function (key, value, time) {}
      };

      const sqliteQuery = new SqliteQuery(fakeServer, {
        resultQuery: 'select * from x',
        activationQuery: '',
        datasource: {
          datasourceClazz: {
            getConnectionString: function () { return 'connectionString';},
            datasource: {
              datasourceParams: {
                cache_enabled: true,
                db_file_path: 'my.db',
              }
            },
            populateParameters: function () {
              return '';
            }
          }
        }
      }, cacheMock);

      // stub _init to skip initialization
      // stub _execute queryto skip query execution
      sinon.stub(sqliteQuery, '_executeQuery', function () {
        return Promise.resolve({result: {}});
      });

      const spy = sinon.spy(sqliteQuery, 'generateCacheKey');

      sqliteQuery.fetchResults({credentials: {username: 'fred'}}, false, 'variableX').then(function (res) {
        expect(res.results).to.eql({ bindings: [{}]});
        expect(spy.callCount).to.equal(1);

        expect(spy.calledWithExactly('my.db', 'select * from x', false, 'variableX', 'fred')).to.be.ok();

        sqliteQuery._executeQuery.restore();
        sqliteQuery.generateCacheKey.restore();
        done();
      }).catch(done);

    });
  });

});
