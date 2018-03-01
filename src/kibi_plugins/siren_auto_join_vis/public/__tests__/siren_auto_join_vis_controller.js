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

  describe('_constructButtons', function () {
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
      $scope._constructButtons()
      .then((buttons) => {
        expect(buttons).to.have.length(1);
        expect(buttons[0].domainIndexPattern).to.be.eql('ib');
        expect(buttons[0].indexRelationId).to.be.eql('another-uuid');
        expect(buttons[0].targetDashboardId).to.be.eql('dd');
        expect(buttons[0].targetField).to.be.eql('fd');
        expect(buttons[0].targetIndexPatternId).to.be.eql('id');
        expect(buttons[0].type).to.be.eql('INDEX_PATTERN');
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
      $scope._constructButtons()
      .then((buttons) => {
        expect(buttons).to.have.length(1);
        expect(buttons[0].domainIndexPattern).to.be.eql('ib');
        expect(buttons[0].indexRelationId).to.be.eql('virtual-entity-uuid');
        expect(buttons[0].targetIndexPatternId).to.be.eql('virtualEntity');
        expect(buttons[0].type).to.be.eql('VIRTUAL_ENTITY');
        expect(buttons[0].targetCount).to.be.eql(undefined);

        const subButton = buttons[0].sub['inverse another virtual label'];
        expect(subButton).to.have.length(1);
        expect(subButton[0].indexRelationId).to.be.eql('virtual-entity-uuid');
        expect(subButton[0].targetIndexPatternId).to.be.eql('ih');
        expect(subButton[0].targetField).to.be.eql('fh');
        expect(subButton[0].sourceIndexPatternId).to.be.eql('ib');
        expect(subButton[0].sourceField).to.be.eql('fb');
        expect(subButton[0].type).to.be.eql('INDEX_PATTERN');

        const altSubButton = buttons[0].altSub['Dashboard h'];
        expect(altSubButton).to.have.length(1);
        expect(altSubButton[0].indexRelationId).to.be.eql('virtual-entity-uuid');
        expect(altSubButton[0].targetIndexPatternId).to.be.eql('ih');
        expect(altSubButton[0].targetField).to.be.eql('fh');
        expect(altSubButton[0].sourceIndexPatternId).to.be.eql('ib');
        expect(altSubButton[0].sourceField).to.be.eql('fb');
        expect(altSubButton[0].type).to.be.eql('INDEX_PATTERN');

        done();
      })
      .catch(done);
    });
  });

});
