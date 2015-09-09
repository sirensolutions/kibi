define(function (require) {
  require('components/kibi/entity_clipboard/entity_clipboard');

  describe('Kibi Components', function () {
    describe('Entity Clipboard', function () {
      var $rootScope;
      var globalState;
      var MockState = require('fixtures/mock_state');
      var _ = require('lodash');

      function init(entityDisabled, entityURI, entityLabel) {
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
              entityURI: entityURI,
              entityDisabled: entityDisabled,
              entityLabel: entityLabel
            });
            return globalState;
          });
        });
        inject(function (_$rootScope_, $compile) {
          $rootScope = _$rootScope_;
          $compile('<kibi-entity-clipboard></kibi-entity-clipboard>')($rootScope);
        });
      }

      it('selected entity', function () {
        init(false, 'uri', 'aaa');
        $rootScope.$emit('kibi:entityURI:changed', null);
        expect($rootScope.disabled).to.be(false);
        expect($rootScope.entityURI).to.be('uri');
        expect($rootScope.label).to.be('aaa');
      });

      it('selected entity but disabled', function () {
        init(true, 'uri', 'aaa');
        $rootScope.$emit('kibi:entityURI:changed', null);
        expect($rootScope.disabled).to.be(true);
        expect($rootScope.entityURI).to.be('uri');
        expect($rootScope.label).to.be('aaa');
      });

      it('an entity missing label takes the URI as label', function () {
        init(false, 'uri', null);
        $rootScope.$emit('kibi:entityURI:changed', null);
        expect($rootScope.disabled).to.be(false);
        expect($rootScope.entityURI).to.be('uri');
        expect($rootScope.label).to.be('uri');
      });

      it('an entity missing the URI', function () {
        init(false, null, 'bye');
        $rootScope.$emit('kibi:entityURI:changed', null);
        expect($rootScope.disabled).to.be(false);
        expect($rootScope.entityURI).to.be(undefined);
        expect($rootScope.label).to.be(undefined);
      });

      it('should remove the entity', function () {
        init(false, 'good', 'bye');
        $rootScope.removeEntity();
        expect($rootScope.disabled).to.be(undefined);
        expect($rootScope.entityURI).to.be(undefined);
        expect($rootScope.label).to.be(undefined);
        expect(globalState.entityDisabled).to.be(undefined);
        expect(globalState.entityURI).to.be(undefined);
        expect(globalState.selectedEntityId).to.be(undefined);
        expect(globalState.entityLabel).to.be(undefined);
      });

      it('should toggle the entity', function () {
        init(false);
        $rootScope.$emit('kibi:entityURI:changed', null);
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
