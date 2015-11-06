define(function (require) {
  require('components/kibi/entity_clipboard/entity_clipboard');

  describe('Kibi Components', function () {
    describe('Entity Clipboard', function () {
      var $rootScope;
      var globalState;
      var MockState = require('fixtures/mock_state');
      var _ = require('lodash');

      function init(entityDisabled, selectedEntities) {
        module('kibana', function ($provide) {
          $provide.service('$route', function () {
            return {
              reload: _.noop
            };
          });
        });
        module('kibana/global_state', function ($provide) {
          $provide.service('globalState', function () {
            globalState = new MockState({
              se: selectedEntities,
              entityDisabled: entityDisabled,
            });
            return globalState;
          });
        });
        inject(function (_$rootScope_, $compile) {
          $rootScope = _$rootScope_;
          $compile('<kibi-entity-clipboard></kibi-entity-clipboard>')($rootScope);
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
});
