define(function (require) {
  var _index_path;

  function init() {
    return function () {
      module('kibana');

      inject(function ($injector, Private) {
        _index_path = Private(require('plugins/kibi/commons/_index_path'));
      });
    };
  }

  describe('Kibi Components', function () {
    beforeEach(init());

    describe('commons', function () {
      describe('._index_path', function () {
        it('should return the correct wildcard index path for a wildcard index pattern', function () {
          expect(_index_path('articles-*')).to.be('articles-*');
        });

        it('should return the correct wildcard index path for an date based index pattern', function () {
          expect(_index_path('[articles-]YYYY.MM.DD')).to.be('articles-*');
        });

        it('should return the correct index path for an explicit index pattern', function () {
          expect(_index_path('articles')).to.be('articles');
        });
      });
    });
  });
});
