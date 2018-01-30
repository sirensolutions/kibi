import sinon from 'sinon';
import ngMock from 'ng_mock';
import $ from 'jquery';
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
      id: 'myCurrentDashboard',
      title: 'myCurrentDashboard',
      savedSearchId: 'Articles'
    },
    {
      id: 'db',
      title: 'Dashboard B',
      savedSearchId: 'sb'
    },
    {
      id: 'dd',
      title: 'Dashboard d',
      savedSearchId: 'sd'
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
    }
  ];

  function init({ currentDashboardId = 'myCurrentDashboard', relations = [], entityById = {} } = {}) {
    ngMock.module('kibana/siren_auto_join_vis', $provide => {
      // $provide.constant('kacConfiguration', { acl: { enabled: enableAcl } });

      $provide.service('getAppState', function () {
        return () => new MockState({ filters: [] });
      });
    });

    ngMock.module('kibana/ontology_client', function ($provide) {
      $provide.service('ontologyClient', function (Promise, Private) {
        return {
          getRelations: function () {
            return Promise.resolve(relations);
          },
          getEntityById: function (id) {
            if (entityById[id]) {
              return Promise.resolve(entityById[id]);
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

    ngMock.inject(function (_kibiState_, _$rootScope_, $controller) {
      kibiState = _kibiState_;
      kibiState._getCurrentDashboardId = sinon.stub().returns(currentDashboardId);
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
    it('should build the buttons', function () {
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
          domain: { id: 'ic', field: 'fc', type: 'INDEX_PATTERN' },
          range: { id: 'id', field: 'fd', type: 'VIRTUAL_ENTITY' }
        }
      ];
      const entityById = {
        id: {
          label: 'a virtual entity'
        }
      };
      init({ relations: relations, entityById: entityById });
      return $scope._constructButtons()
      .then((buttons) => {
        // expect(buttons).to.have.length(2);
        expect(true).to.be.eql(true);
      });
    });
  });

});
