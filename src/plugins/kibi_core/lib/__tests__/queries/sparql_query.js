var Promise = require('bluebird');
var expect = require('expect.js');
var sinon = require('sinon');

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



describe('SparqlQuery', function () {

  describe('fetchResults test if correct arguments are passed to generateCacheKey', function () {
    it('simple query', function (done) {

      var cacheMock = {
        get: function (key) { return '';},
        set: function (key, value, time) {}
      };

      var SparqlQuery = require('../../queries/sparql_query');
      var sparqlQuery = new SparqlQuery(fakeServer, {
        resultQuery: 'select * from x',
        activationQuery: '',
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
      }, cacheMock);

      // stub _init to skip initialization
      // stub _execute queryto skip query execution
      sinon.stub(sparqlQuery, '_executeQuery', function () {
        return Promise.resolve({results: {bindings: [{}]}});
      });

      var spy = sinon.spy(sparqlQuery, 'generateCacheKey');

      sparqlQuery.fetchResults({credentials: {username: 'fred'}}, false, 'variableX').then(function (res) {
        expect(res.results).to.eql({bindings: [{}]});
        expect(spy.callCount).to.equal(1);

        expect(spy.calledWithExactly('http://localhost:9876', 'select * from x', false, 'variableX', 'fred')).to.be.ok();

        sparqlQuery._executeQuery.restore();
        sparqlQuery.generateCacheKey.restore();
        done();
      }).catch(done);

    });
  });

});
