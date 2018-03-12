import sinon from 'sinon';
import ngMock from 'ng_mock';
import $ from 'jquery';
import _ from 'lodash';
import expect from 'expect.js';
import noDigestPromises from 'test_utils/no_digest_promises';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';
import { MockState } from 'fixtures/mock_state';

describe('Kibi Automatic Join Visualization Controller', function () {
  let $scope;
  let $rootScope;
  let kibiState;

  const fakeSavedDashboards = [
    {
      id: 'db',
      title: 'Dashboard b',
      savedSearchId: 'sb'
    },
    {
      id: 'dd',
      title: 'Dashboard d',
      savedSearchId: 'sd'
    },
    {
      id: 'dh',
      title: 'Dashboard h',
      savedSearchId: 'sh'
    }
  ];
  const fakeSavedSearches = [
    {
      id: 'sb',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'ib',
            filter: [],
            query: {}
          }
        )
      }
    },
    {
      id: 'sd',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'id',
            filter: [],
            query: {}
          }
        )
      }
    },
    {
      id: 'sh',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'ih',
            filter: [],
            query: {}
          }
        )
      }
    }
  ];

  function init({ currentDashboardId = 'db', relations = [], entities = [] } = {}) {
    ngMock.module('kibana/siren_auto_join_vis', $provide => {
      $provide.service('getAppState', function () {
        return () => new MockState({ filters: [] });
      });
    });

    ngMock.module('kibana/ontology_client', function ($provide) {
      $provide.service('ontologyClient', function (Promise, Private) {
        return {
          getRelations: () => {
            return Promise.resolve(relations);
          },
          getRelationsByDomain: (domain) => {
            const filtered = _.filter(relations, (rel) => {
              return rel.domain.id === domain;
            });
            return Promise.resolve(filtered);
          },
          getEntities: (id) => {
            return entities;
          },
          getEntityById: (id) => {
            const found = _.find(entities, 'id', id);
            if (found) {
              return Promise.resolve(found);
            } else {
              return Promise.resolve();
            }
          }
        };
      });
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboard', fakeSavedDashboards));
    });

    ngMock.module('discover/saved_searches', function ($provide) {
      $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', fakeSavedSearches));
    });

    ngMock.module('kibana', ($provide) => {
      $provide.service('es', function (Promise) {
        return {
          search: (query) => {
            if (query.body && query.body.aggs && query.body.aggs.distinct_field) {
              return Promise.resolve({
                aggregations: {
                  distinct_field: { value: 300 }
                }
              });
            } else {
              return Promise.resolve();
            }
          }
        };
      });
    });

    ngMock.inject(function (_kibiState_, _$rootScope_, $controller) {
      kibiState = _kibiState_;
      kibiState.getCurrentDashboardId = sinon.stub().returns(currentDashboardId);
      kibiState.isSirenJoinPluginInstalled = sinon.stub().returns(true);

      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $scope.vis = {
        params: {
          buttons: []
        }
      };

      const $element = $('<div>');
      $controller('SirenAutoJoinVisController', { $scope, $element });
    });
  }

  noDigestPromises.activateForSuite();

  describe('getButtonLabel', function () {

    const label = 'Correct count is {0}';
    const data = [
      {
        button: {
          label,
          targetCount: undefined
        },
        addApproximate: false,
        expectedLabel: 'Correct count is ?'
      },
      {
        button: {
          label,
          targetCount: 0
        },
        addApproximate: false,
        expectedLabel: 'Correct count is 0'
      },
      {
        button: {
          label,
          targetCount: 10
        },
        addApproximate: false,
        expectedLabel: 'Correct count is 10'
      },
      {
        button: {
          label,
          targetCount: undefined
        },
        addApproximate: true,
        expectedLabel: 'Correct count is ?'
      },
      {
        button: {
          label,
          targetCount: 0
        },
        addApproximate: true,
        expectedLabel: 'Correct count is ~0'
      },
      {
        button: {
          label,
          targetCount: 10
        },
        addApproximate: true,
        expectedLabel: 'Correct count is ~10'
      }
    ];

    _.each(data, (entry) => {
      it('should compute correct label: ' + entry.expectedLabel, function () {
        init({});
        expect($scope.getButtonLabel(entry.button, entry.addApproximate)).to.equal(entry.expectedLabel);
      });
    });
  });

  describe('constructTree', function () {
    it('should build the buttons - with index patterns', function (done) {
      const relations = [
        {
          id: 'some-uuid',
          directLabel: 'some label',
          domain: { id: 'ia', field: 'fa', type: 'INDEX_PATTERN' },
          range: { id: 'ib', field: 'fb', type: 'INDEX_PATTERN' }
        },
        {
          id: 'another-uuid',
          directLabel: 'another label',
          domain: { id: 'ib', field: 'fb', type: 'INDEX_PATTERN' },
          range: { id: 'id', field: 'fd', type: 'INDEX_PATTERN' }
        }
      ];

      init({ relations });
      $scope.constructTree()
      .then((tree) => {
        expect(tree.nodes).to.have.length(1);
        const button = tree.nodes[0].button;
        expect(button.domainIndexPattern).to.be.eql('ib');
        expect(button.indexRelationId).to.be.eql('another-uuid');
        expect(button.targetDashboardId).to.be.eql('dd');
        expect(button.targetField).to.be.eql('fd');
        expect(button.targetIndexPatternId).to.be.eql('id');
        expect(button.type).to.be.eql('INDEX_PATTERN');
        done();
      })
      .catch(done);
    });

    it('should build the buttons - with entity identifiers', function (done) {
      const relations = [
        {
          id: 'virtual-entity-uuid',
          directLabel: 'virtual label',
          domain: { id: 'ib', field: 'fb', type: 'INDEX_PATTERN' },
          range: { id: 'virtualEntity', field: '', type: 'VIRTUAL_ENTITY' }
        },
        {
          id: 'inverse-of-virtual-entity-uuid',
          directLabel: 'inverse virtual label',
          domain: { id: 'virtualEntity', field: '', type: 'VIRTUAL_ENTITY' },
          range: { id: 'ib', field: 'fb', type: 'INDEX_PATTERN' }
        },
        {
          id: 'another-virtual-entity-uuid',
          directLabel: 'another virtual label',
          domain: { id: 'ih', field: 'fh', type: 'INDEX_PATTERN' },
          range: { id: 'virtualEntity', field: '', type: 'VIRTUAL_ENTITY' }
        },
        {
          id: 'inverse-of-another-virtual-entity-uuid',
          directLabel: 'inverse another virtual label',
          domain: { id: 'virtualEntity', field: '', type: 'VIRTUAL_ENTITY' },
          range: { id: 'ih', field: 'fh', type: 'INDEX_PATTERN' }
        }
      ];
      const entities = [
        {
          id: 'virtualEntity',
          label: 'a virtual entity'
        }
      ];
      init({ relations, entities });

      $scope.vis.params.layout = 'normal';

      $scope.constructTree()
      .then((tree) => {
        expect(tree.nodes).to.have.length(1);
        const firstNode = tree.nodes[0];

        expect(firstNode.button.domainIndexPattern).to.be.eql('ib');
        expect(firstNode.button.indexRelationId).to.be.eql('virtual-entity-uuid');
        expect(firstNode.button.targetIndexPatternId).to.be.eql('virtualEntity');
        expect(firstNode.button.type).to.be.eql('VIRTUAL_ENTITY');
        expect(firstNode.button.targetCount).to.be.eql(undefined);

        expect(firstNode.nodes.length).to.be.eql(1);
        expect(firstNode.altNodes.length).to.be.eql(1);

        const firstNodeRel = firstNode.nodes[0];
        expect(firstNodeRel.label).to.equal('inverse another virtual label');
        expect(firstNodeRel.nodes.length).to.be.eql(1);

        const relButtonNode = firstNodeRel.nodes[0];
        expect(relButtonNode.button.indexRelationId).to.be.eql('virtual-entity-uuid');
        expect(relButtonNode.button.targetIndexPatternId).to.be.eql('ih');
        expect(relButtonNode.button.targetField).to.be.eql('fh');
        expect(relButtonNode.button.sourceIndexPatternId).to.be.eql('ib');
        expect(relButtonNode.button.sourceField).to.be.eql('fb');
        expect(relButtonNode.button.type).to.be.eql('INDEX_PATTERN');

        const firstNodeDash = firstNode.altNodes[0];
        expect(firstNodeDash.label).to.equal('Dashboard h ');
        expect(firstNodeDash.nodes.length).to.be.eql(1);

        const dashButtonNode = firstNodeDash.nodes[0];
        expect(dashButtonNode.button.indexRelationId).to.be.eql('virtual-entity-uuid');
        expect(dashButtonNode.button.targetIndexPatternId).to.be.eql('ih');
        expect(dashButtonNode.button.targetField).to.be.eql('fh');
        expect(dashButtonNode.button.sourceIndexPatternId).to.be.eql('ib');
        expect(dashButtonNode.button.sourceField).to.be.eql('fb');
        expect(dashButtonNode.button.type).to.be.eql('INDEX_PATTERN');

        done();
      })
      .catch(done);
    });
  });

});
