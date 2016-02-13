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

      it('Should set document uri if in globalScope.se contains items', function () {
        globalState.se = ['uri1', 'uri2'];
        var holder = {};
        setEntityUri(holder);
        expect(holder.entityURI).to.equal('uri1');
      });

      it('Should set document uri if globalScope.se empty', function () {
        globalState.se = [];
        var holder = {};
        setEntityUri(holder);
        expect(holder.entityURI).to.equal('');
      });

    });
  });
});

