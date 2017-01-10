const waitForPluginList = require('../wait_for_plugin_list');
const expect = require('expect.js');
const Promise = require('bluebird');

const getFakeConfig = function () {
  return {
    set: function (key, value) {
      this[key] = value;
    }
  };
};

const getFakeServer = function (fakeConfig, nodes, plugins) {
  return {
    config: function () {
      return fakeConfig;
    },
    plugins: {
      elasticsearch: {
        client: {
          cat: {
            nodes: function (options) {
              return Promise.resolve(nodes);
            },
            plugins: function (options) {
              return Promise.resolve(plugins);
            }
          }
        }
      }
    }
  };
};

const getFakePlugin = function () {
  let redMsg;

  return {
    status: {
      red: function (msg) {
        if (msg) {
          redMsg = msg;
        } else {
          return redMsg;
        }
      }
    }
  };
};

describe('plugins/elasticsearch', function () {
  describe('lib/wait_plugin_list', function () {

    it('should contain array with siren-join', function (done) {
      const fakePlugin = getFakePlugin();
      const fakeConfig = getFakeConfig();
      const fakeServer = getFakeServer(
        fakeConfig,
        [
          {
            name: 'nodeA',
            'node.role': 'd',
            ip: '127.0.0.1'
          }
        ],
        [
          {
            name: 'nodeA',
            component: 'siren-join'
          },
        ]
      );

      waitForPluginList(fakePlugin, fakeServer).then(function () {
        expect(fakeConfig['elasticsearch.plugins']).to.eql(['siren-join']);
        expect(fakePlugin.status.red()).to.eql(undefined);
        done();
      }).catch(done);
    });

    it('should contain array with siren-join 2 nodes', function (done) {
      const fakePlugin = getFakePlugin();
      const fakeConfig = getFakeConfig();
      const fakeServer = getFakeServer(
        fakeConfig,
        [
          {
            name: 'nodeA',
            'node.role': 'd',
            ip: '127.0.0.1'
          },
          {
            name: 'nodeB',
            'node.role': 'd',
            ip: '127.0.0.1'
          }
        ],
        [
          {
            name: 'nodeA',
            component: 'siren-join'
          },
          {
            name: 'nodeB',
            component: 'siren-join'
          },
        ]
      );

      waitForPluginList(fakePlugin, fakeServer).then(function () {
        expect(fakeConfig['elasticsearch.plugins']).to.eql(['siren-join']);
        expect(fakePlugin.status.red()).to.eql(undefined);
        done();
      }).catch(done);
    });

    it('should contain array with siren-join 2 nodes but mark plugin status as red', function (done) {
      const fakePlugin = getFakePlugin();
      const fakeConfig = getFakeConfig();
      const fakeServer = getFakeServer(
        fakeConfig,
        [
          {
            name: 'nodeA',
            'node.role': 'd',
            ip: '127.0.0.1'
          },
          {
            name: 'nodeB',
            'node.role': 'd',
            ip: '127.0.0.1'
          }
        ],
        [
          {
            name: 'nodeA',
            component: 'siren-join'
          },
          {
            name: 'nodeB',
            component: 'missing-siren-join'
          },
        ]
      );

      waitForPluginList(fakePlugin, fakeServer).then(function () {
        expect(fakeConfig['elasticsearch.plugins']).to.eql(['siren-join', 'missing-siren-join']);
        expect(fakePlugin.status.red()).to.eql(
          'SIREn Join plugin is missing at data node:[nodeB] ip:[127.0.0.1]\n' +
          'SIREn Join plugin should be installed on all data nodes.'
        );
        done();
      }).catch(done);
    });


    it('should contain array with other-plugin, should not change status to red as no siren-join detected', function (done) {
      const fakePlugin = getFakePlugin();
      const fakeConfig = getFakeConfig();
      const fakeServer = getFakeServer(
        fakeConfig,
        [
          {
            name: 'nodeA',
            'node.role': 'd',
            ip: '127.0.0.1'
          },
          {
            name: 'nodeB',
            'node.role': 'd',
            ip: '127.0.0.1'
          }
        ],
        [
          {
            name: 'nodeA',
            component: 'other-plugin'
          },
          {
            name: 'nodeB',
            component: 'other-plugin'
          },
        ]
      );

      waitForPluginList(fakePlugin, fakeServer).then(function () {
        expect(fakeConfig['elasticsearch.plugins']).to.eql(['other-plugin']);
        expect(fakePlugin.status.red()).to.eql(undefined);
        done();
      }).catch(done);
    });


  });
});
