const _ = require('lodash');
const Promise = require('bluebird');
const sinon = require('sinon');
const expect = require('expect.js');

const upgradeConfig = require('../upgrade_config');

describe('plugins/elasticsearch', function () {
  describe('lib/upgrade_config', function () {
    let get;
    let server;
    let client;
    let config;
    let upgrade;

    beforeEach(function () {
      get = sinon.stub();
      get.withArgs('kibana.index').returns('.my-kibana');
      get.withArgs('pkg.kibiVersion').returns('4.0.1');
      get.withArgs('pkg.buildNum').returns(Math.random());
      client = { create: sinon.stub() };
      server = {
        log: sinon.stub(),
        config: function () {
          return {
            get: get
          };
        },
        plugins: { elasticsearch: { client: client } }
      };
      upgrade = upgradeConfig(server);
    });

    describe('nothing is found', function () {
      const response = { hits: { hits:[] } };

      beforeEach(function () {
        client.create.returns(Promise.resolve());
      });

      describe('production', function () {
        beforeEach(function () {
          get.withArgs('env.name').returns('production');
          get.withArgs('env.prod').returns(true);
          get.withArgs('env.dev').returns(false);
        });

        it('should resolve buildNum to pkg.buildNum config', function () {
          return upgrade(response).then(function (resp) {
            sinon.assert.calledOnce(client.create);
            const params = client.create.args[0][0];
            expect(params.body).to.have.property('buildNum', get('pkg.buildNum'));
          });
        });

        it('should resolve version to pkg.kibiVersion config', function () {
          return upgrade(response).then(function (resp) {
            const params = client.create.args[0][0];
            expect(params).to.have.property('id', get('pkg.kibiVersion'));
          });
        });
      });

      describe('development', function () {
        beforeEach(function () {
          get.withArgs('env.name').returns('development');
          get.withArgs('env.prod').returns(false);
          get.withArgs('env.dev').returns(true);
        });

        it('should resolve buildNum to pkg.buildNum config', function () {
          return upgrade(response).then(function (resp) {
            const params = client.create.args[0][0];
            expect(params.body).to.have.property('buildNum', get('pkg.buildNum'));
          });
        });

        it('should resolve version to pkg.kibiVersion config', function () {
          return upgrade(response).then(function (resp) {
            const params = client.create.args[0][0];
            expect(params).to.have.property('id', get('pkg.kibiVersion'));
          });
        });
      });
    });

    it('should resolve with undefined if the current version is found', function () {
      const response = { hits: { hits: [ { _id: '4.0.1' } ] } };
      return upgrade(response).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should resolve with undefined if nothing is upgradeable', function () {
      const response = { hits: { hits: [ { _id: '4.0.1-snapshot' }, { _id: '4.5.4-SNAPSHOT' } ] } };
      return upgrade(response).then(function (resp) {
        expect(resp).to.be(undefined);
      });
    });

    it('should sort configurations by buildNum descending', function () {
      const response = {
        hits: {
          hits: [
            {
              _id: '3.4.1',
              _source: {
                buildNum: 8881
              }
            },
            {
              _id: '3.5.3',
              _source: {
                buildNum: 12059,
                someSetting: true
              }
            },
            {
              _id: '3.4.2',
              _source: {
                buildNum: 11447
              }
            },
            {
              _id: 'foo',
              _source: {}
            },
            {
              _id: 'bar',
              _source: {
                buildNum: 'abcd'
              }
            }
          ]
        }
      };

      get.withArgs('pkg.buildNum').returns(20000);
      client.create.returns(Promise.resolve());
      return upgrade(response)
      .then(() => {
        sinon.assert.calledWith(client.create, {
          index: '.my-kibana',
          type: 'config',
          id: '4.0.1',
          body: {
            buildNum: 20000,
            someSetting: true
          }
        });
      });
    });

    it('should update the build number on the new config', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      const response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        const params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('buildNum', 5801);
        expect(params).to.have.property('index', '.my-kibana');
        expect(params).to.have.property('type', 'config');
        expect(params).to.have.property('id', '4.0.1');
      });
    });

    it('should log a message for upgrades', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      const response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1 } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(server.log);
        expect(server.log.args[0][0]).to.eql(['plugin', 'elasticsearch']);
        const msg = server.log.args[0][1];
        expect(msg).to.have.property('prevVersion', '4.0.0');
        expect(msg).to.have.property('newVersion', '4.0.1');
        expect(msg.tmpl).to.contain('Upgrade');
      });
    });

    it('should copy attributes from old config', function () {
      get.withArgs('pkg.buildNum').returns(5801);
      client.create.returns(Promise.resolve());
      const response = { hits: { hits: [ { _id: '4.0.0', _source: { buildNum: 1, defaultIndex: 'logstash-*' } } ] } };
      return upgrade(response).then(function (resp) {
        sinon.assert.calledOnce(client.create);
        const params = client.create.args[0][0];
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('defaultIndex', 'logstash-*');
      });
    });

  });
});
