const expect = require('expect.js');
const ngMock = require('ngMock');
let relationsHelper;
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
  describe('getJoinIndicesUniqueID', function () {
    beforeEach(() => init({}));

    it('should compute the relation unique ID', function () {
      const indexa = 'ia';
      const typea = 'ta';
      const patha = 'pa';
      const indexb = 'ib';
      const typeb = 'tb';
      const pathb = 'pb';
      const id = `${indexa}/${typea}/${patha}/${indexb}/${typeb}/${pathb}`;

      expect(relationsHelper.getJoinIndicesUniqueID(indexa, typea, patha, indexb, typeb, pathb)).to.be(id);
    });

    it('should escape special keywords', function () {
      const id = 'i-slash-a/t-slash-a/p-slash-a/i-slash-b/t-slash-b/p-slash-b';

      expect(relationsHelper.getJoinIndicesUniqueID('i/a', 't/a', 'p/a', 'i/b', 't/b', 'p/b')).to.be(id);
    });
  });

  describe('getRelationInfosFromRelationID', function () {
    beforeEach(() => init({}));

    it('should get the correct relation details', function () {
      const indexa = 'ia';
      const typea = 'ta';
      const patha = 'pa';
      const indexb = 'ib';
      const typeb = 'tb';
      const pathb = 'pb';

      const id = relationsHelper.getJoinIndicesUniqueID(indexa, typea, patha, indexb, typeb, pathb);
      expect(relationsHelper.getRelationInfosFromRelationID(id))
      .to.eql({
        source: {
          index: indexa,
          type: typea,
          path: patha
        },
        target: {
          index: indexb,
          type: typeb,
          path: pathb
        }
      });
    });

    it('should manage the special keywords correctly', function () {
      const indexa = 'i/a';
      const typea = 't/a';
      const patha = 'p/a';
      const indexb = 'i/b';
      const typeb = 't/b';
      const pathb = 'p/b';

      const id = relationsHelper.getJoinIndicesUniqueID(indexa, typea, patha, indexb, typeb, pathb);
      expect(relationsHelper.getRelationInfosFromRelationID(id))
      .to.eql({
        source: {
          index: indexa,
          type: typea,
          path: patha
        },
        target: {
          index: indexb,
          type: typeb,
          path: pathb
        }
      });
    });

    it('should escape special keywords', function () {
      const id = 'i-slash-a/t-slash-a/p-slash-a/i-slash-b/t-slash-b/p-slash-b';

      expect(relationsHelper.getJoinIndicesUniqueID('i/a', 't/a', 'p/a', 'i/b', 't/b', 'p/b')).to.be(id);
    });
  });

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


