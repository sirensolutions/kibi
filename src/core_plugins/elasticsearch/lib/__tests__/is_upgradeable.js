import _ from 'lodash';
import expect from 'expect.js';

import isUpgradeable from '../is_upgradeable';
// kibi: export only package_json
import { pkg } from '../../../../utils/package_json';
let version = pkg.kibi_version;

describe('plugins/elasticsearch', function () {
  describe('lib/is_upgradeable', function () {
    const server = {
      config: _.constant({
        get: function (key) {
          switch (key) {
            case 'pkg.kibiVersion': return version;
            default: throw new Error(`no stub for config key ${key}`);
          }
        }
      })
    };

    function upgradeDoc(id, _version, bool) {
      describe('', function () {
        before(function () { version = _version; });

        it(`should return ${bool} for ${id} <= ${version}`, function () {
          expect(isUpgradeable(server, { id: id })).to.be(bool);
        });

        after(function () { version = pkg.kibi_version; });
      });
    }

    upgradeDoc('1.0.0-beta1', pkg.kibi_version, true);
    upgradeDoc(pkg.kibi_version, pkg.kibi_version, false);
    upgradeDoc('4.0.0-RC1', '4.0.0-RC2', true);
    upgradeDoc('4.0.0-rc2', '4.0.0-rc1', false);
    upgradeDoc('4.0.0-rc2', '4.0.0', true);
    upgradeDoc('4.0.0-rc2', '4.0.2', true);
    upgradeDoc('4.0.1', '4.1.0-rc', true);
    upgradeDoc('4.0.0-rc1', '4.0.0', true);
    upgradeDoc('4.0.0-rc1-snapshot', '4.0.0', false);
    upgradeDoc('4.1.0-rc1-snapshot', '4.1.0-rc1', false);
    // kibi: additional tests
    upgradeDoc('4.6.3', '4.6.4', true);

    // kibi: support upgrade from a release to a snapshot
    upgradeDoc('4.5.4', '4.5.4-SNAPSHOT', true);
    upgradeDoc('4.1.0', '4.5.4-SNAPSHOT', true);

    // kibi: support alpha/beta release cycle
    upgradeDoc('4.5.4-alpha-1', '4.5.4-alpha-2', true);
    upgradeDoc('4.5.4-beta-1', '4.5.4-alpha-2', false);
    upgradeDoc('4.5.4-alpha-1', '4.5.4-beta-2', true);
    upgradeDoc('4.5.4', '4.5.4-alpha-2', false);
    upgradeDoc('4.5.3-3', '4.5.4-alpha-1', true);
    upgradeDoc('4.5.4-beta-2', '4.5.4', true);
    upgradeDoc('4.5.4-beta2', '4.5.4', true);
    upgradeDoc('4.5.4-beta2', '4.5.4-beta-3', true);
    upgradeDoc('4.5.4-beta-4', '4.5.4-rc-1', true);

    // kibi: dash upgrades
    upgradeDoc('4.6.3', '4.6.3-1', true);
    upgradeDoc('4.5.4', '4.5.4-1', true);
    upgradeDoc('4.6.3-1', '4.6.3', false);
    upgradeDoc('4.6.3-1', '4.6.3-2', true);
    upgradeDoc('4.6.3', '4.6.4-1', true);
    upgradeDoc('4.5.4-1', '4.5.4', false);
    upgradeDoc('4.5.4-1', '4.6.3-1', true);
    upgradeDoc('4.5.4-beta-2', '4.6.3-1', true);
    upgradeDoc('4.5.3-1', '4.5.3-6', true);
    upgradeDoc('4.5.3', '4.5.3-6', true);

    it('should handle missing id field', function () {
      const configSavedObject = {
        'type': 'config',
        'attributes': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };

      expect(isUpgradeable(server, configSavedObject)).to.be(false);
    });

    it('should handle id of @@version', function () {
      const configSavedObject = {
        'type': 'config',
        'id': '@@version',
        'attributes': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };
      expect(isUpgradeable(server, configSavedObject)).to.be(false);
    });

  });


});
