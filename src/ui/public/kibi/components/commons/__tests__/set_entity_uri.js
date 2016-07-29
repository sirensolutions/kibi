var ngMock = require('ngMock');
var expect = require('expect.js');
var globalState;
var setEntityUri;

describe('Kibi Components', function () {
  describe('Commons', function () {
    describe('setEntityUri', function () {

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.inject(function ($injector, Private, _globalState_) {
          globalState = _globalState_;
          setEntityUri = Private(require('ui/kibi/components/commons/_set_entity_uri'));
        });
      });

      it('should set document uri if in globalScope.se contains items', function () {
        globalState.se = ['uri1', 'uri2'];
        var holder = {
          visible: true
        };
        setEntityUri(holder);
        expect(holder.entityURI).to.equal('uri1');
      });

      it('should set document uri if in globalScope.se_temp contains items', function () {
        globalState.se = ['uri1', 'uri2'];
        globalState.se_temp = ['uri3'];
        var holder = {
          visible: true
        };
        setEntityUri(holder);
        expect(holder.entityURI).to.equal('uri3');
      });

      it('should set document uri to empty string if globalScope.se and globalScope.se_temp empty', function () {
        globalState.se = [];
        globalState.se_temp = [];
        var holder = {
          visible: true
        };
        setEntityUri(holder);
        expect(holder.entityURI).to.equal('');
      });

      it('should set document uri to empty string if the entity is not visible', function () {
        globalState.se = ['uri1', 'uri2'];
        var holder = {
          visible: false
        };
        setEntityUri(holder);
        expect(holder.entityURI).to.equal('');
      });

    });
  });
});

