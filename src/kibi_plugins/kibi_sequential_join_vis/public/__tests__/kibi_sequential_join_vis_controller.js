import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import sinon from 'auto-release-sinon';
import noDigestPromises from 'test_utils/no_digest_promises';
import Promise from 'bluebird';
import MockState from 'fixtures/mock_state';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';

describe('Kibi Sequential Join Visualization Controller', function () {
  let $scope;
  let $rootScope;
  let kibiState;

  const fakeSavedDashboards = [
    {
      id: 'Companies',
      title: 'Companies'
    }
  ];

  function init({ enableAcl = true } = {}) {
    ngMock.module('kibana/kibi_sequential_join_vis', $provide => {
      $provide.constant('kacConfiguration', { acl: { enabled: enableAcl } });

      kibiState = new MockState({ filters: [] });
      kibiState._getCurrentDashboardId = sinon.stub().returns('myCurrentDashboard');
      kibiState.isSirenJoinPluginInstalled = sinon.stub().returns(true);
      kibiState._getDashboardAndSavedSearchMetas = sinon.stub().returns(Promise.resolve([]));

      $provide.service('kibiState', () => kibiState);

      $provide.service('getAppState', function () {
        return () => new MockState({ filters: [] });
      });
    });

    ngMock.module('app/dashboard', function ($provide) {
      $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboard', fakeSavedDashboards));
    });

    ngMock.inject(function (_$rootScope_, $controller) {
      $rootScope = _$rootScope_;
      $scope = $rootScope.$new();
      $scope.vis = {
        params: {
          buttons: []
        }
      };

      const $element = $('<div>');
      $controller('KibiSequentialJoinVisController', { $scope, $element });
    });
  }

  noDigestPromises.activateForSuite();

  describe('_constructButtons', function () {
    it('should reject if a button definition is incorrect', function () {
      const relations = {
        relationsIndices: [
          {
            id: 'indexa//patha/indexb//pathb',
            label: 'myrel',
            indices: [
              { indexPatternId: 'indexa', indexPatternType: '', path: 'patha' },
              { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
            ]
          }
        ]
      };

      init();
      $rootScope.$emit('change:config.kibi:relations', relations);
      $scope.vis.params.buttons = [
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'article//companies/company//id',
          label:  'Companies -->',
          sourceDashboardId:  '',
          targetDashboardId:  'Companies'
        }
      ];

      return $scope._constructButtons()
      .then(() => expect().fail(new Error('should fail')))
      .catch(err => {
        expect(err).to.be('Invalid configuration of the Kibi relational filter visualization');
      });
    });

    it('should remove the definition of buttons based on forbidden dashboards', function () {
      const relations = {
        relationsIndices: [
          {
            id: 'indexa//patha/indexb//pathb',
            label: 'myrel',
            indices: [
              { indexPatternId: 'indexa', indexPatternType: '', path: 'patha' },
              { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
            ]
          },
          {
            id: 'article//companies/company//id',
            label: 'mentions',
            indices: [
              { indexPatternId: 'article', indexPatternType: '', path: 'companies' },
              { indexPatternId: 'company', indexPatternType: '', path: 'id' }
            ]
          }
        ]
      };

      init();
      $rootScope.$emit('change:config.kibi:relations', relations);
      $scope.vis.params.buttons = [
        {
          filterLabel:  'something',
          indexRelationId:  'indexa//patha/indexb//pathb',
          label:  'to b',
          sourceDashboardId:  '',
          targetDashboardId:  'DashboardB'
        },
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'article//companies/company//id',
          label:  'Companies -->',
          sourceDashboardId:  '',
          targetDashboardId:  'Companies'
        }
      ];

      return $scope._constructButtons()
      .then(() => {
        sinon.assert.calledWith(kibiState._getDashboardAndSavedSearchMetas, [ 'myCurrentDashboard', 'Companies' ]);
      });
    });

    it('should not remove the definition of buttons based on missing dashboards if ACL is disabled', function () {
      const relations = {
        relationsIndices: [
          {
            id: 'indexa//patha/indexb//pathb',
            label: 'myrel',
            indices: [
              { indexPatternId: 'indexa', indexPatternType: '', path: 'patha' },
              { indexPatternId: 'indexb', indexPatternType: '', path: 'pathb' }
            ]
          },
          {
            id: 'article//companies/company//id',
            label: 'mentions',
            indices: [
              { indexPatternId: 'article', indexPatternType: '', path: 'companies' },
              { indexPatternId: 'company', indexPatternType: '', path: 'id' }
            ]
          }
        ]
      };

      init({ enableAcl: false });
      $rootScope.$emit('change:config.kibi:relations', relations);
      $scope.vis.params.buttons = [
        {
          filterLabel:  'something',
          indexRelationId:  'indexa//patha/indexb//pathb',
          label:  'to b',
          sourceDashboardId:  '',
          targetDashboardId:  'DashboardB'
        },
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'article//companies/company//id',
          label:  'Companies -->',
          sourceDashboardId:  '',
          targetDashboardId:  'Companies'
        }
      ];

      return $scope._constructButtons()
      .then(() => {
        sinon.assert.calledWith(kibiState._getDashboardAndSavedSearchMetas, [ 'myCurrentDashboard', 'DashboardB', 'Companies' ]);
      });
    });
  });
});
