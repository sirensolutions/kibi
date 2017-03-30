var { SELECTED_DOCUMENT_NEEDED, QUERY_RELEVANT, QUERY_DEACTIVATED } = require('../../_symbols');
var Promise = require('bluebird');
var expect = require('expect.js');
var sinon = require('sinon');
var JdbcQuery = require('../../queries/jdbc_query');

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
  get: function (key) { return; },
  set: function (key, value, time) {}
};

var queryDefinition = {
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
      var jdbcQuery = new JdbcQuery(fakeServer, queryDefinition, cacheMock);

      // stub _init to skip initialization
      sinon.stub(jdbcQuery, '_init', function () {
        return Promise.resolve(true);
      });
      // stub _execute queryto skip query execution
      sinon.stub(jdbcQuery, '_executeQuery', function () {
        return Promise.resolve({result: []});
      });

      var spy = sinon.spy(jdbcQuery, 'generateCacheKey');

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
      var jdbcQuery = new JdbcQuery(fakeServer, queryDefinition, cacheMock);

      // stub _init to skip initialization
      sinon.stub(jdbcQuery, '_init', function () {
        return Promise.resolve(true);
      });
      // stub _execute queryto skip query execution
      sinon.stub(jdbcQuery, '_executeQuery', function () {
        return Promise.resolve({result: []});
      });

      var spy = sinon.spy(jdbcQuery, 'generateCacheKey');

      jdbcQuery.checkIfItIsRelevant({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.equal(QUERY_DEACTIVATED);
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
