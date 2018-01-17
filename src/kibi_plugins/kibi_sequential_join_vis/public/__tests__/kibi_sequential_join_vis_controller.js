import chrome from 'ui/chrome';
import { Notifier } from 'ui/notify/notifier';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';
import sinon from 'sinon';
import noDigestPromises from 'test_utils/no_digest_promises';
import Promise from 'bluebird';
import { MockState } from 'fixtures/mock_state';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import $ from 'jquery';

describe('Kibi Sequential Join Visualization Controller', function () {
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
      id: 'dashboard saved search missing',
      title: 'dashboard saved search missing',
      savedSearchId: 'missing'
    },
    {
      id: 'Companies',
      title: 'Companies',
      savedSearchId: 'Companies'
    },
    {
      id: 'Test',
      title: 'Test',
      savedSearchId: 'Companies'
    }
  ];
  const fakeSavedSearches = [
    {
      id: 'Companies',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'company',
            filter: [],
            query: {}
          }
        )
      }
    },
    {
      id: 'Articles',
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify(
          {
            index: 'article',
            filter: [],
            query: {}
          }
        )
      }
    }
  ];

  function init({ enableAcl = true, currentDashboardId = 'myCurrentDashboard', relations = [] } = {}) {
    ngMock.module('kibana/kibi_sequential_join_vis', $provide => {
      $provide.constant('kacConfiguration', { acl: { enabled: enableAcl } });

      $provide.service('getAppState', function () {
        return () => new MockState({ filters: [] });
      });
    });

    ngMock.module('kibana/ontology_client', function ($provide) {
      $provide.service('ontologyClient', function () {
        return {
          getRelations: function () {
            return Promise.resolve(relations);
          }
        };
      });
    });

    chrome.getInjected = function () {
      return {
        acl: {
          enabled: enableAcl
        }
      };
    };

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
      $controller('KibiSequentialJoinVisController', { $scope, $element });
    });
  }

  noDigestPromises.activateForSuite();

  afterEach(() => {
    Notifier.prototype._notifs.length = 0;
  });

  describe('_constructButtons', function () {
    it('should reject if a button definition is incorrect', function () {
      const relations = [
        {
          id: 'some-uuid',
          directLabel: 'myrel',
          domain: { id: 'indexa', field: 'patha' },
          range: { id: 'indexb', field: 'pathb' }
        }
      ];

      init({ relations: relations });
      kibiState._getDashboardAndSavedSearchMetas = sinon.stub().returns(Promise.resolve([]));
      $scope.vis.params.buttons = [
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
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
      const relations = [
        {
          id: 'some-uuid',
          directLabel: 'myrel',
          domain: { id: 'indexa', field: 'patha' },
          range: { id: 'indexb', field: 'pathb' }
        },
        {
          id: 'another-uuid',
          directLabel: 'mentions',
          domain: { id: 'article', ield: 'companies' },
          range: { id: 'company', field: 'id' }
        }
      ];

      init({ relations: relations});
      kibiState._getDashboardAndSavedSearchMetas = sinon.stub().returns(Promise.resolve([]));
      $scope.vis.params.buttons = [
        {
          filterLabel:  'something',
          indexRelationId:  'some-uuid',
          label:  'to b',
          sourceDashboardId:  '',
          targetDashboardId:  'DashboardB'
        },
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
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
      const relations = [
        {
          id: 'some-uuid',
          directLabel: 'myrel',
          domain: { id: 'indexa', field: 'patha' },
          range: { id: 'indexb', field: 'pathb' }
        },
        {
          id: 'another-uuid',
          directLabel: 'mentions',
          domain: { id: 'article', field: 'companies' },
          range: { id: 'company', field: 'id' }
        }
      ];

      init({ enableAcl: false, relations: relations });
      kibiState._getDashboardAndSavedSearchMetas = sinon.stub().returns(Promise.resolve([]));
      $scope.vis.params.buttons = [
        {
          filterLabel:  'something',
          indexRelationId:  'some-uuid',
          label:  'to b',
          sourceDashboardId:  '',
          targetDashboardId:  'DashboardB'
        },
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
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

    it('should build the buttons', function () {
      const relations = [{
        id: 'another-uuid',
        directLabel: 'mentions',
        domain: { id: 'article', field: 'companies' },
        range: { id: 'company', field: 'id' }
      }];

      init({ enableAcl: false, relations: relations });
      $scope.vis.params.buttons = [
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
          label:  'rel',
          sourceDashboardId:  '',
          targetDashboardId:  'Test'
        },
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
          label:  'Companies -->',
          sourceDashboardId:  '',
          targetDashboardId:  'Companies'
        }
      ];

      return $scope._constructButtons()
      .then(buttons => {
        expect(buttons).to.have.length(2);
      });
    });

    it('should not build the buttons if the current dashboard index is missing', function () {
      const relations = [{
        id: 'another-uuid',
        directLabel: 'mentions',
        domain: { id: 'article', field: 'companies' },
        range: { id: 'company', field: 'id' }
      }];

      init({ currentDashboardId: 'dashboard saved search missing', enableAcl: false, relations: relations });
      $scope.vis.params.buttons = [
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
          label:  'Companies -->',
          sourceDashboardId:  '',
          targetDashboardId:  'Companies'
        }
      ];

      return $scope._constructButtons()
      .then(buttons => {
        expect(buttons).to.have.length(0);
        expect(Notifier.prototype._notifs).to.have.length(1);
        expect(Notifier.prototype._notifs[0].type).to.be('warning');
        expect(Notifier.prototype._notifs[0].content)
          .to.contain('The dashboard [dashboard saved search missing] is associated with an unknown saved search.');
      });
    });

    it('should build the buttons even if some information needed by a button is missing', function () {
      const relations = [{
        id: 'another-uuid',
        directLabel: 'mentions',
        domain: { id: 'article', field: 'companies' },
        range: { id: 'company', field: 'id' }
      }];

      init({ enableAcl: false, relations: relations });
      $scope.vis.params.buttons = [
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
          label:  'rel',
          sourceDashboardId:  '',
          targetDashboardId:  'dashboard saved search missing'
        },
        {
          filterLabel:  '..mentioned in $COUNT Articles',
          indexRelationId:  'another-uuid',
          label:  'Companies -->',
          sourceDashboardId:  '',
          targetDashboardId:  'Companies'
        }
      ];

      return $scope._constructButtons()
      .then(buttons => {
        expect(buttons).to.have.length(1);
        expect(Notifier.prototype._notifs).to.have.length(1);
        expect(Notifier.prototype._notifs[0].type).to.be('warning');
        expect(Notifier.prototype._notifs[0].content)
          .to.contain('The dashboard [dashboard saved search missing] is associated with an unknown saved search.');
      });
    });
  });
});
