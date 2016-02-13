var ngMock = require('ngMock');
var expect = require('expect.js');

var a;

describe('Kibi Components', function () {
  describe('ST Doc Table', function () {
    describe('_is_this_entity_in_selected_entities', function () {

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.inject(function (Private) {
          a = Private(require('ui/kibi/components/commons/_is_this_entity_in_selected_entities'));
        });
      });

      it('document should be in the selected documents', function () {
        var se = [
          'a/b/c/d'
        ];
        var entityId = 'c';
        var column = 'd';
        expect(a(se, entityId, column)).to.be(true);
      });

      it('document should not be in the selected documents', function () {
        var se = [
          'a/b/c/e',
          'a/b/f/d'
        ];
        var entityId = 'c';
        var column = 'd';
        expect(a(se, entityId, column)).to.be(false);
      });

      it('should not faile if somehow arguments are undefined', function () {
        expect(a(undefined, 'a', 'b')).to.be(false);
        expect(a([], undefined, 'b')).to.be(false);
        expect(a([], 'a', undefined)).to.be(false);
      });
    });
  });
});
