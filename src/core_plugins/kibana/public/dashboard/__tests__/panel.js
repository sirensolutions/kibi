import expect from 'expect.js';
import ngMock from 'ng_mock';
import Promise from 'bluebird';
import sinon from 'sinon';
import noDigestPromise from 'test_utils/no_digest_promises';
import mockUiState from 'fixtures/mock_ui_state';
import { SavedObjectsClientProvider } from 'ui/saved_objects';

describe('dashboard panel', function () {
  let $scope;
  let $el;
  let parentScope;
  let mgetStub;

  noDigestPromise.activateForSuite();

  function init(mockDocResponse) {
    ngMock.module('kibana', $provide => {
      $provide.constant('kibiDatasourcesSchema', {});
    });
    ngMock.inject(($rootScope, $compile, Private, esAdmin, savedObjectsAPI, kibiState) => {
      // kibi: use the savedObjectsAPI instead of esAdmin, inject getEntityURI() for check in panel.js
      mgetStub = sinon.stub(savedObjectsAPI, 'mget').returns(Promise.resolve({ docs: [ mockDocResponse ] }));
      sinon.stub(kibiState, 'getEntityURI').returns({ index: 'a', type: 'b', id: 'c' });
      // kibi: end

      // MERGE 5.6
      // understand if what we are doing here
      // stubbing mget instead of swapping SavedObjectsClientProvider is OK
      // Private.swap(SavedObjectsClientProvider, () => {
      //   return {
      //     get: sinon.stub().returns(Promise.resolve(mockDocResponse))
      //   };
      // });
      // sinon.stub(esAdmin.indices, 'getFieldMapping').returns(Promise.resolve({
      //   '.kibana': {
      //     mappings: {
      //       visualization: {}
      //     }
      //   }
      // }));

      parentScope = $rootScope.$new();
      parentScope.saveState = sinon.stub();
      parentScope.createChildUiState = sinon.stub().returns(mockUiState);
      parentScope.getVisClickHandler = sinon.stub();
      parentScope.getVisBrushHandler = sinon.stub();
      parentScope.registerPanelIndexPattern = sinon.stub();
      parentScope.panel = {
        col: 3,
        id: 'foo1',
        row: 1,
        size_x: 2,
        size_y: 2,
        type: 'visualization'
      };
      $el = $compile(`
        <dashboard-panel
          panel="panel"
          is-full-screen-mode="false"
          is-expanded="false"
          get-vis-click-handler="getVisClickHandler"
          get-vis-brush-handler="getVisBrushHandler"
          save-state="saveState"
          register-panel-index-pattern="registerPanelIndexPattern"
          create-child-ui-state="createChildUiState">
        </dashboard-panel>`)(parentScope);
      $scope = $el.isolateScope();
      parentScope.$digest();
    });
  }

  afterEach(() => {
    $scope.$destroy();
    $el.remove();
    mgetStub.restore();
  });

  it('should not visualize the visualization if it does not exist', function () {
    init({ found: false });
    return $scope.loadedPanel.then(() => {
      // kibi: kibi uses savedObjectsAPI, error is different from kibana
      expect($scope.error).to.be('Could not locate object of type: visualization. (id: foo1)');
      parentScope.$digest();
      const content = $el.find('.panel-content');
      expect(content).to.have.length(0);
    });
  });

  it('should try to visualize the visualization if found', function () {
    init({ found: true, _source: {} }); // kibi: changed the response to contain _source
    return $scope.loadedPanel.then(() => {
      expect($scope.error).not.to.be.ok();
      parentScope.$digest();
      const content = $el.find('.panel-content');
      expect(content).to.have.length(1);
    });
  });
});
