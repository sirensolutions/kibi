let _ = require('lodash');
let expect = require('expect.js');
let sinon = require('sinon');

let isUpgradeable = require('../is_upgradeable');
let utils = require('requirefrom')('src/utils');
let pkg = utils('packageJson');
let version = pkg.kibi_version;

describe('plugins/elasticsearch', function () {
  describe('lib/isUpgradeable', function () {
    let server = {
      config: _.constant({
        get: function (key) {
          switch (key) {
            case 'pkg.kibiVersion': return version;
            default: throw new Error(`no stub for config key ${key}`);
          }
        }
      })
    };

    function upgradeDoc(_id, _version, bool) {
      describe('', function () {
        before(function () { version = _version; });

        it(`should return ${bool} for ${_id} <= ${_version}`, function () {
          expect(isUpgradeable(server, { _id: _id })).to.be(bool);
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

    it('should handle missing _id field', function () {
      let doc = {
        '_index': '.kibi',
        '_type': 'config',
        '_score': 1,
        '_source': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };

      expect(isUpgradeable(server, doc)).to.be(false);
    });

    it('should handle _id of @@version', function () {
      let doc = {
        '_index': '.kibi',
        '_type': 'config',
        '_id': '@@version',
        '_score': 1,
        '_source': {
          'buildNum': 1.7976931348623157e+308,
          'defaultIndex': '[logstash-]YYYY.MM.DD'
        }
      };
      expect(isUpgradeable(server, doc)).to.be(false);
    });

  });


});
