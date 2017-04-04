const expect = require('expect.js');
const _ = require('lodash');
const Promise = require('bluebird');
const QueryEngine = require('../query_engine');
const sinon = require('sinon');
const EventEmitter = require('events').EventEmitter;
var SqliteQuery = require('../queries/sqlite_query');

var queryEngine;
var stub;
var expectedMsg = { message: 'QueryEngine initialized successfully.' };

FakeStatus.prototype = new EventEmitter(); // inherit from EventEmitter
FakeStatus.prototype.constructor = FakeStatus;
function FakeStatus(status) {
  this.state = status;
}

const searchStub = sinon.stub();

var fakeServer = {
  log: _.noop,
  config: function () {
    return {
      get: function (property) {
        switch (property) {
          case 'kibana.index':
            return '.kibi';
          case 'kibi_core.gremlin_server.ssl.ca':
            return null;
          case 'pkg.kibiEnterpriseEnabled':
            return false;
          case 'kibi_core.load_jdbc':
            return false;
          default:
            throw new Error(`Unsupported config property: ${property}`);
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      client: {
        search: searchStub
      },
      status: {
        state: 'green'
      }
    }
  }
};


describe('Query Engine', function () {

  describe('Should trigger _onStatusGreen correctly during init', function () {

    it('when elasticsearch status is already green', function (done) {
      var server = fakeServer;
      server.plugins.elasticsearch.status = new FakeStatus('green');
      queryEngine = new QueryEngine(server);
      stub = sinon.stub(queryEngine, '_onStatusGreen').returns(Promise.resolve(true));

      queryEngine._init(500, false).then(function (ret) {
        expect(stub.calledOnce).to.equal(true);
        expect(ret).eql(expectedMsg);
        done();
      }).catch(done);
    });

    it('when elasticsearch status is NOT yet green', function (done) {
      var server = fakeServer;
      server.plugins.elasticsearch.status = new FakeStatus('red');

      queryEngine = new QueryEngine(server);
      stub = sinon.stub(queryEngine, '_onStatusGreen').returns(Promise.resolve(true));

      queryEngine._init(500, false).then(function (ret) {
        expect(stub.calledOnce).to.equal(true);
        expect(ret).eql(expectedMsg);
        done();
      }).catch(done);

      fakeServer.plugins.elasticsearch.status.state = 'green';
      fakeServer.plugins.elasticsearch.status.emit('change');
    });

    it('when elasticsearch status changes red-yellow-green', function (done) {
      var server = fakeServer;
      server.plugins.elasticsearch.status = new FakeStatus('red');

      queryEngine = new QueryEngine(server);
      stub = sinon.stub(queryEngine, '_onStatusGreen').returns(Promise.resolve(true));

      queryEngine._init(500, false).then(function (ret) {
        expect(stub.calledOnce).to.equal(true);
        expect(ret).eql(expectedMsg);
        done();
      }).catch(done);

      // then change status to yellow
      fakeServer.plugins.elasticsearch.status.state = 'yellow';
      fakeServer.plugins.elasticsearch.status.emit('change');

      // then change status to green
      fakeServer.plugins.elasticsearch.status.state = 'green';
      fakeServer.plugins.elasticsearch.status.emit('change');
    });
  });

  describe('_getQueries', function () {
    let queryEngine;

    beforeEach(function () {
      sinon.stub(QueryEngine.prototype, 'loadPredefinedData').returns(Promise.resolve());
      sinon.stub(QueryEngine.prototype, '_loadTemplates').returns(Promise.resolve());
      searchStub
        .withArgs({ index: '.kibi', type: 'datasource', size: 100 })
        .returns(Promise.resolve({
          hits: {
            total: 1,
            hits: [
              {
                _id: 'datasource1',
                _source: {
                  datasourceType: 'sqlite',
                  datasourceParams: {
                    db_file_path: '',
                    max_age: 123,
                    cache_enabled: false
                  }
                }
              }
            ]
          }
        }));

      queryEngine = new QueryEngine(fakeServer);
    });

    afterEach(function () {
      QueryEngine.prototype.loadPredefinedData.restore();
      QueryEngine.prototype._loadTemplates.restore();
      SqliteQuery.prototype._executeQuery.restore();
      SqliteQuery.prototype.generateCacheKey.restore();
    });

    it('should be a deactivated query', function () {
      const queryDefs = [
        {
          queryId: 'query1'
        }
      ];
      const options = {};

      searchStub
        .withArgs({ index: '.kibi', type: 'query', size: 100 })
        .returns(Promise.resolve({
          hits: {
            hits: [
              {
                _id: 'query1',
                _source: {
                  title: 'Query 1',
                  datasourceId: 'datasource1',
                  activationQuery: 'select * from nothing',
                  resultQuery: 'select * from everything'
                }
              }
            ]
          }
        }));
      // for the call to check the activation query
      sinon.stub(SqliteQuery.prototype, '_executeQuery').returns(Promise.resolve([]));
      sinon.spy(SqliteQuery.prototype, 'generateCacheKey');

      return queryEngine.getQueriesHtml(queryDefs, options)
      .then(([ result ]) => {
        expect(result.queryId).to.be('query1');
        expect(result.queryActivated).to.be(false);
        expect(result.html).to.be('No query template is triggered now. Select a document?');
      });
    });

    it('should depend on a document to be selected', function () {
      const queryDefs = [
        {
          queryId: 'query1'
        },
        {
          queryId: 'query2'
        }
      ];
      const options = {};

      searchStub
        .withArgs({ index: '.kibi', type: 'query', size: 100 })
        .returns(Promise.resolve({
          hits: {
            hits: [
              {
                _id: 'query1',
                _source: {
                  title: 'Query 1',
                  datasourceId: 'datasource1',
                  activationQuery: 'select * from nothing where id = @doc[id]@',
                  resultQuery: 'select * from everything'
                }
              },
              {
                _id: 'query2',
                _source: {
                  title: 'Query 2',
                  datasourceId: 'datasource1',
                  activationQuery: 'select * from nothing',
                  resultQuery: 'select * from everything where id = @doc[id]@'
                }
              }
            ]
          }
        }));
      // for the call to check the activation query
      sinon.stub(SqliteQuery.prototype, '_executeQuery').returns(Promise.resolve([]));
      sinon.spy(SqliteQuery.prototype, 'generateCacheKey');

      return queryEngine.getQueriesHtml(queryDefs, options)
      .then(([ result1, result2 ]) => {
        expect(result1.queryId).to.be('query1');
        expect(result1.queryActivated).to.be(true);
        expect(result1.html).to.be('The query query1 needs a document to be selected');

        expect(result2.queryId).to.be('query2');
        expect(result2.queryActivated).to.be(true);
        expect(result2.html).to.be('The query query2 needs a document to be selected');
      });
    });
  });
});
