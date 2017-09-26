import waitForPluginList from '../wait_for_plugin_list';
import expect from 'expect.js';
import Promise from 'bluebird';

const getFakeConfig = function () {
  return {
    set: function (key, value) {
      this[key] = value;
    }
  };
};

const getFakeServer = function (fakeConfig, nodes, plugins) {
  return {
    config() {
      return fakeConfig;
    },
    plugins: {
      elasticsearch: {
        getCluster() {
          return {
            callWithInternalUser(method, params) {
              switch (method) {
                case 'cat.nodes':
                  return Promise.resolve(nodes);
                case 'cat.plugins':
                  return Promise.resolve(plugins);
                default:
                  expect().fail(`Unexpected method: ${method}`);
              }
            }
          };
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

    it('should contain array with siren-vanguard', function () {
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
            component: 'siren-vanguard'
          },
        ]
      );

      return waitForPluginList(fakePlugin, fakeServer)
      .then(function () {
        expect(fakeConfig['kibi_core.clusterplugins']).to.eql(['siren-vanguard']);
        expect(fakePlugin.status.red()).to.eql(undefined);
      });
    });

    it('should contain array with siren-vanguard 2 nodes', function () {
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
            component: 'siren-vanguard'
          },
          {
            name: 'nodeB',
            component: 'siren-vanguard'
          },
        ]
      );

      return waitForPluginList(fakePlugin, fakeServer).then(function () {
        expect(fakeConfig['kibi_core.clusterplugins']).to.eql(['siren-vanguard']);
        expect(fakePlugin.status.red()).to.eql(undefined);
      });
    });

    it('should contain array with siren-vanguard 2 nodes but mark plugin status as red', function () {
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
            component: 'siren-vanguard'
          },
          {
            name: 'nodeB',
            component: 'missing-siren-vanguard'
          },
        ]
      );

      return waitForPluginList(fakePlugin, fakeServer).then(function () {
        expect(fakeConfig['kibi_core.clusterplugins']).to.eql(['siren-vanguard', 'missing-siren-vanguard']);
        expect(fakePlugin.status.red()).to.eql(
          'Siren Vanguard plugin is missing at data node:[nodeB] ip:[127.0.0.1]\n' +
          'Siren Vanguard plugin should be installed on all data nodes.'
        );
      });
    });


    it('should contain array with other-plugin, should not change status to red as no siren-vanguard detected', function () {
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

      return waitForPluginList(fakePlugin, fakeServer).then(function () {
        expect(fakeConfig['kibi_core.clusterplugins']).to.eql(['other-plugin']);
        expect(fakePlugin.status.red()).to.eql(undefined);
      });
    });


  });
});
