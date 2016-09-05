var expect = require('expect.js');
var ngMock = require('ngMock');
var relationsHelper;
let config;

function init({ kibiEnterpriseEnabled = false }) {
  ngMock.module('kibana', function ($provide) {
    $provide.service('config', require('fixtures/kibi/config'));
    $provide.constant('kibiEnterpriseEnabled', kibiEnterpriseEnabled);
  });
  ngMock.inject(function (_config_, Private) {
    config = _config_;
    relationsHelper = Private(require('ui/kibi/helpers/relations_helper'));
  });
}

describe('Kibi Components', function () {
  describe('addAdvancedJoinSettingsToRelation', function () {
    beforeEach(() => init({
      kibiEnterpriseEnabled: true
    }));

    it('should fail if the relation is not present', function () {
      config.set('kibi:relations', {
        relationsIndices: [
          {
            indices: [
              {
                indexPatternId: 'investor',
                path: 'id'
              },
              {
                indexPatternId: 'investment',
                path: 'investorid'
              }
            ],
            label: 'by',
            id: 'investment/investorid/investor/id'
          }
        ]
      });
      const missingRelation = [
        {
          indices: [ 'company' ],
          path: 'id'
        },
        {
          indices: [ 'article' ],
          path: 'companies'
        }
      ];

      expect(relationsHelper.addAdvancedJoinSettingsToRelation).withArgs(missingRelation)
      .to.throwException(/Could not find index relation corresponding to relation between/);
    });

    it('should get advanced relation for the given relation', function () {
      config.set('kibi:relations', {
        relationsIndices: [
          {
            indices: [
              {
                indexPatternId: 'investor',
                path: 'id',
                termsEncoding: 'enc1',
                orderBy: 'asc',
                maxTermsPerShard: 1
              },
              {
                indexPatternId: 'investment',
                path: 'investorid',
                termsEncoding: 'enc2',
                orderBy: 'desc',
                maxTermsPerShard: 2
              }
            ],
            label: 'by',
            id: 'investment//investorid/investor//id'
          }
        ]
      });

      const relation1 = [
        {
          indices: [ 'investment' ],
          path: 'investorid'
        },
        {
          indices: [ 'investor' ],
          path: 'id'
        }
      ];
      relationsHelper.addAdvancedJoinSettingsToRelation(relation1);
      expect(relation1[0].termsEncoding).to.be('enc1');
      expect(relation1[0].orderBy).to.be('asc');
      expect(relation1[0].maxTermsPerShard).to.be(1);
      expect(relation1[1].termsEncoding).to.be('enc2');
      expect(relation1[1].orderBy).to.be('desc');
      expect(relation1[1].maxTermsPerShard).to.be(2);

      const relation2 = [
        {
          indices: [ 'investor' ],
          path: 'id'
        },
        {
          indices: [ 'investment' ],
          path: 'investorid'
        }
      ];
      relationsHelper.addAdvancedJoinSettingsToRelation(relation2);
      expect(relation2[0].termsEncoding).to.be('enc2');
      expect(relation2[0].orderBy).to.be('desc');
      expect(relation2[0].maxTermsPerShard).to.be(2);
      expect(relation2[1].termsEncoding).to.be('enc1');
      expect(relation2[1].orderBy).to.be('asc');
      expect(relation2[1].maxTermsPerShard).to.be(1);
    });
  });
});


