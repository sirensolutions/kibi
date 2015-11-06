define(function (require) {
  var _set_entity_uri;
  var globalState;

  describe('Kibi Components', function () {
    describe('Commons', function () {
      describe('_set_entity_uri', function () {

        beforeEach( function () {
          module('kibana');

          inject(function ($injector, Private, _globalState_) {
            globalState = _globalState_;
            _set_entity_uri = Private(require('plugins/kibi/commons/_set_entity_uri'));
          });
        });

        it('Should set document uri if in globalScope.se contains items', function () {
          globalState.se = ['uri1', 'uri2'];
          var holder = {};
          _set_entity_uri(holder);
          expect(holder.entityURI).to.equal('uri1');
        });

        it('Should set document uri if globalScope.se empty', function () {
          globalState.se = [];
          var holder = {};
          _set_entity_uri(holder);
          expect(holder.entityURI).to.equal('');
        });

      });
    });
  });
});

