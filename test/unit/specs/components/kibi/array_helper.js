define(function (require) {

  var arrayHelper;

  function init() {
    return function () {
      module('kibana');

      inject(function ($injector, Private, _$rootScope_) {
        arrayHelper = Private(require('components/kibi/array_helper/array_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    beforeEach(init());

    describe('arrayHelper', function () {


      it('test add', function () {
        var input = [];
        var expected = [
          {id: 1}
        ];
        arrayHelper.add(input, {id: 1}, null);
        expect(input).to.be.an('array');
        expect(input).to.eql(expected);
      });

      it('test remove', function () {
        var input = [{id: 1}];
        var expected = [];
        arrayHelper.remove(input, 0, null);
        expect(input).to.be.an('array');
        expect(input).to.eql(expected);
      });

      it('test up', function () {
        var input = [{id: 1}, {id: 2}];
        var expected = [{id: 2}, {id: 1}];
        arrayHelper.up(input, 1, null);
        expect(input).to.be.an('array');
        expect(input).to.eql(expected);

        // moving the first up should do nothing
        arrayHelper.up(input, 0, null);
        expect(input).to.be.an('array');
        expect(input).to.eql(expected);
      });

      it('test down', function () {
        var input = [{id: 1}, {id: 2}];
        var expected = [{id: 2}, {id: 1}];

        arrayHelper.down(input, 0, null);
        expect(input).to.be.an('array');
        expect(input).to.eql(expected);

        // moving the last one down should do nothing
        arrayHelper.down(input, 1, null);
        expect(input).to.be.an('array');
        expect(input).to.eql(expected);
      });

      it('test callback executed', function () {
        var input = [];
        var counter = 0;
        var callback = function () {
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
});

