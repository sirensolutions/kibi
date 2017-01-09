const ngMock = require('ngMock');
const expect = require('expect.js');
let indexPath;

function init() {
  return function () {
    ngMock.module('kibana');

    ngMock.inject(function ($injector, Private) {
      indexPath = Private(require('ui/kibi/components/commons/_index_path'));
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
