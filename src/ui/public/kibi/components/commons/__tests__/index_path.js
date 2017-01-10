import ngMock from 'ng_mock';
import expect from 'expect.js';
import IndexPathProvider from 'ui/kibi/components/commons/_index_path';

let indexPath;

function init() {
  return function () {
    ngMock.module('kibana');

    ngMock.inject(function ($injector, Private) {
      indexPath = Private(IndexPathProvider);
    });
  };
}

describe('Kibi Components', function () {
  beforeEach(init());

  describe('commons', function () {
    describe('.indexPath', function () {
      it('should return the correct wildcard index path for a wildcard index pattern', function () {
        expect(indexPath('articles-*')).to.be('articles-*');
      });

      it('should return the correct wildcard index path for an date based index pattern', function () {
        expect(indexPath('[articles-]YYYY.MM.DD')).to.be('articles-*');
      });

      it('should return the correct index path for an explicit index pattern', function () {
        expect(indexPath('articles')).to.be('articles');
      });
    });
  });
});
