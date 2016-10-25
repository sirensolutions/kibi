import expect from 'expect.js';
import { resolve } from 'path';

function fixture(name) {
  return resolve(__dirname, 'fixtures', name);
}

describe('cli/serve/read_yaml_config', function () {

  let readYamlConfig;

  context('environment placeholders', function () {
    let currEnv;

    before(function () {
      currEnv = process.env;
      process.env = {
        URL: 'http://localhost',
        BAR: 'bar',
        CA: 'ca',
        NODE: '1'
      };

      readYamlConfig = require('../read_yaml_config');
    });

    it('resolves environment placeholders', function () {
      const config = readYamlConfig(fixture('env.yml'));
      expect(config).to.eql({
        url: 'http://localhost',
        server: {
          node: 'node1',
          url: 'http://localhost'
        },
        service: {
          url: 'http://localhost'
        },
        users: [
          'foo',
          'bar',
          'barbar',
          ''
        ],
        ssl: {
          ca: 'ca'
        },
        app: '',
        null: null,
        num: 3
      });
    });

    after(function () {
      process.env = currEnv;
    });

  });
});
