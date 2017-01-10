const expect = require('expect.js');
const ngMock = require('ngMock');
let arrayHelper;

function init() {
  return function () {
    ngMock.module('kibana');
    ngMock.inject(function ($injector, Private, _$rootScope_) {
      arrayHelper = Private(require('ui/kibi/helpers/array_helper'));
    });
  };
}

describe('Kibi Components', function () {
  beforeEach(init());

  describe('arrayHelper', function () {


    it('test add', function () {
      const input = [];
      const expected = [
        {id: 1}
      ];
      arrayHelper.add(input, {id: 1}, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test remove', function () {
      const input = [{id: 1}];
      const expected = [];
      arrayHelper.remove(input, 0, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test up', function () {
      const input = [{id: 1}, {id: 2}];
      const expected = [{id: 2}, {id: 1}];
      arrayHelper.up(input, 1, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);

      // moving the first up should do nothing
      arrayHelper.up(input, 0, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test down', function () {
      const input = [{id: 1}, {id: 2}];
      const expected = [{id: 2}, {id: 1}];

      arrayHelper.down(input, 0, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);

      // moving the last one down should do nothing
      arrayHelper.down(input, 1, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test callback executed', function () {
      const input = [];
      let counter = 0;
      const callback = function () {
        counter++;
      };

      arrayHelper.add(input, {id: 1}, callback);
      arrayHelper.add(input, {id: 2}, callback);
      expect(counter).to.eql(2);

      arrayHelper.up(input, 1, callback);
      expect(counter).to.eql(3);

      arrayHelper.down(input, 0, callback);
      expect(counter).to.eql(4);

      arrayHelper.remove(input, 1, callback);
      arrayHelper.remove(input, 0, callback);
      expect(counter).to.eql(6);
    });


  });

});


