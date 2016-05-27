var ngMock = require('ngMock');
var expect = require('expect.js');

require('../kibi_entity_clipboard');

describe('Kibi Components', function () {
  describe('Entity Clipboard', function () {
    var $rootScope;
    var $location;
    var globalState;
    var appState;
    var kibiStateHelper;
    var MockState = require('fixtures/mock_state');
    var _ = require('lodash');

    function init(entityDisabled, selectedEntities) {
      ngMock.module(
        'kibana',
        'kibana/courier',
        'kibana/global_state',
        function ($provide) {
          $provide.constant('kbnDefaultAppId', '');
          $provide.constant('kibiDefaultDashboardId', '');
          $provide.service('$route', function () {
            return {
              reload: _.noop
            };
          });

          appState = new MockState({ filters: [] });
          $provide.service('getAppState', function () {
            return function () { return appState; };
          });

          globalState = new MockState({
            se: selectedEntities,
            entityDisabled: entityDisabled,
          });
          $provide.service('globalState', function () {
            return globalState;
          });
        }
      );

      ngMock.inject(function (Private, _$location_, _$rootScope_, $compile) {
        $rootScope = _$rootScope_;
        $location = _$location_;
        $compile('<kibi-entity-clipboard></kibi-entity-clipboard>')($rootScope);
        kibiStateHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
      });
    }

    it('selected document', function () {
      init(false, ['index/type/id/column']);
      $rootScope.$emit('kibi:selectedEntities:changed', null);
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/column');
    });

    it('selected document but disabled', function () {
      init(true, ['index/type/id/column']);
      $rootScope.$emit('kibi:selectedEntities:changed', null);
      expect($rootScope.disabled).to.be(true);
      expect($rootScope.entityURI).to.be('index/type/id/column');
    });

    it('an entity missing column takes the URI as label', function () {
      init(false, ['index/type/id']);
      $rootScope.$emit('kibi:selectedEntities:changed', null);
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id');
      expect($rootScope.label).to.be('index/type/id');
    });

    it('an document missing the URI', function () {
      init(false, []);
      $rootScope.$emit('kibi:selectedEntities:changed', null);
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be(undefined);
      expect($rootScope.label).to.be(undefined);
    });

    it('should remove the document', function () {
      init(false, ['index/type/id/column/label']);
      $rootScope.removeAllEntities();
      expect($rootScope.disabled).to.be(undefined);
      expect($rootScope.entityURI).to.be(undefined);
      expect($rootScope.label).to.be(undefined);
      expect(globalState.entityDisabled).to.be(undefined);
      expect(globalState.se).to.be(undefined);
    });

    it('should remove the document and associated filters', function () {
      init(false, ['index/type/id/column/label']);

      $location.url('/dashboard/dashboard2?_a=(filters:!((filter:2,meta:()),(filter:3,meta:(dependsOnSelectedEntities:!t))))');
      globalState.k = {
        d: {
          dashboard1: {
            f: [ { filter: 1, meta: { dependsOnSelectedEntities: true } } ]
          },
          dashboard2: {
            f: [ { filter: 2, meta: {} } ]
          }
        }
      };
      globalState.save();

      $rootScope.removeAllEntities();

      // appstate filters
      expect(appState.filters).to.eql([ { filter: 2, meta: {} } ]);
      // globalstate filters
      const allFilters = kibiStateHelper.getAllFilters();
      expect(allFilters.dashboard1).to.have.length(0);
      expect(allFilters.dashboard2).to.have.length(1);
    });

    it('should toggle the selected document', function () {
      init(false);
      $rootScope.$emit('kibi:selectedEntities:changed', null);
      expect($rootScope.disabled).to.be(false);
      expect(globalState.entityDisabled).to.be(false);
      $rootScope.toggleClipboard();
      expect($rootScope.disabled).to.be(true);
      expect(globalState.entityDisabled).to.be(true);
      $rootScope.toggleClipboard();
      expect($rootScope.disabled).to.be(false);
      expect(globalState.entityDisabled).to.be(false);
    });

  });
});
