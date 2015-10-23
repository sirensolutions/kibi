define(function (require) {
  var a;

  describe('Kibi Components', function () {
    describe('ST Doc Table', function () {
      describe('_is_this_entity_in_selected_entities', function () {

        beforeEach( function () {
          module('kibana');

          inject(function (Private) {
            a = Private(require('components/sindicetech/st_doc_table/components/_is_this_entity_in_selected_entities'));
          });
        });

        it('entity should be in the selected entities', function () {
          var se = [
            'a/b/c/d'
          ];
          var entityId = 'c';
          var column = 'd';
          expect(a(se, entityId, column)).to.be(true);
        });

        it('entity should not be in the selected entities', function () {
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
});

