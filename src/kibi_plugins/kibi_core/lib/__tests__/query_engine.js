import expect from 'expect.js';
import _ from 'lodash';
import Promise from 'bluebird';
import QueryEngine from '../query_engine';
import sinon from 'sinon';
import { EventEmitter } from 'events';
import SqliteQuery from '../queries/sqlite_query';

let queryEngine;
let stub;
const expectedMsg = { message: 'QueryEngine initialized successfully.' };

FakeStatus.prototype = new EventEmitter(); // inherit from EventEmitter
FakeStatus.prototype.constructor = FakeStatus;
function FakeStatus(status) {
  this.state = status;
}

const callWithInternalUserStub = sinon.stub();

const fakeServer = {
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
      status: {
        state: 'green'
      },
      getCluster() {
        return {
          callWithInternalUser: callWithInternalUserStub
        };
      }
    }
  }
};

describe('Query Engine', function () {
  describe('Should trigger _onStatusGreen correctly during init', function () {
    it('when elasticsearch status is already green', function (done) {
      const server = fakeServer;
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
      const server = fakeServer;
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
      const server = fakeServer;
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
    let stubLoadPredefinedData;
    let stubLoadTemplates;

    beforeEach(function () {
      stubLoadPredefinedData = sinon.stub(QueryEngine.prototype, 'loadPredefinedData').returns(Promise.resolve());
      stubLoadTemplates = sinon.stub(QueryEngine.prototype, '_loadTemplates').returns(Promise.resolve());
      callWithInternalUserStub
        .withArgs('search', { index: '.kibi', type: 'datasource', size: 100 })
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

    afterEach(() => {
      stubLoadPredefinedData.restore();
      stubLoadTemplates.restore();
    });

    it('should be a deactivated query', function () {
      const queryDefs = [
        {
          queryId: 'query1'
        }
      ];
      const options = {};

      callWithInternalUserStub
        .withArgs('search', { index: '.kibi', type: 'query', size: 100 })
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
      const stubExecuteQuery = sinon.stub(SqliteQuery.prototype, '_executeQuery').returns(Promise.resolve([]));
      const stubGenerateCacheKey = sinon.spy(SqliteQuery.prototype, 'generateCacheKey');

      return queryEngine.getQueriesHtml(queryDefs, options)
      .then(([ result ]) => {
        expect(result.queryId).to.be('query1');
        expect(result.queryActivated).to.be(false);
        expect(result.html).to.be('No query template is triggered now. Select a document?');

        stubExecuteQuery.restore();
        stubGenerateCacheKey.restore();
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

      callWithInternalUserStub
        .withArgs('search', { index: '.kibi', type: 'query', size: 100 })
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
      const stubExecuteQuery = sinon.stub(SqliteQuery.prototype, '_executeQuery').returns(Promise.resolve([]));
      const stubGenerateCacheKey = sinon.spy(SqliteQuery.prototype, 'generateCacheKey');

      return queryEngine.getQueriesHtml(queryDefs, options)
      .then(([ result1, result2 ]) => {
        expect(result1.queryId).to.be('query1');
        expect(result1.queryActivated).to.be(true);
        expect(result1.html).to.be('The query <b>Query 1</b> needs a document to be selected');

        expect(result2.queryId).to.be('query2');
        expect(result2.queryActivated).to.be(true);
        expect(result2.html).to.be('The query <b>Query 2</b> needs a document to be selected');

        stubExecuteQuery.restore();
        stubGenerateCacheKey.restore();
      });
    });
  });
});
