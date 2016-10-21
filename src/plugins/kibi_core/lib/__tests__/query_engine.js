const expect = require('expect.js');
const _ = require('lodash');
const Promise = require('bluebird');
const QueryEngine = require('../query_engine');
const sinon = require('sinon');
const EventEmitter = require('events').EventEmitter;

var queryEngine;
var stub;
var expectedMsg = { message: 'QueryEngine initialized successfully.' };

FakeStatus.prototype = new EventEmitter(); // inherit from EventEmitter
FakeStatus.prototype.constructor = FakeStatus;
function FakeStatus(status) {
  this.state = status;
}

var fakeServer = {
  config: function () {
    return {
      get: function (property) {
        switch (property) {
          case 'kibi_core.gremlin_server.ssl.ca':
            return null;
          case 'pkg.kibiEnterpriseEnabled':
            return false;
          default:
            throw new Error(`Unsupported config property: ${property}`);
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      status: null
    }
  }
};


describe('Query Engine', function () {

  describe('Should trigger _onStatusGreen correctly during init', function () {

    afterEach(function () {
      queryEngine._onStatusGreen.restore();
    });

    it('when elasticsearch status is already green', function (done) {
      var server = fakeServer;
      server.plugins.elasticsearch.status = new FakeStatus('green');
      queryEngine = new QueryEngine(server);
      stub = sinon.stub(queryEngine, '_onStatusGreen', function () {
        return Promise.resolve(true);
      });

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
      stub = sinon.stub(queryEngine, '_onStatusGreen', function () {
        return Promise.resolve(true);
      });

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
      stub = sinon.stub(queryEngine, '_onStatusGreen', function () {
        return Promise.resolve(true);
      });

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
});
