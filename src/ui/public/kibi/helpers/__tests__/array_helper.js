import ArrayHelper from 'ui/kibi/helpers/array_helper';
import expect from 'expect.js';

describe('Kibi Components', function () {
  describe('ArrayHelper', function () {
    it('test add', function () {
      const input = [];
      const expected = [
        {id: 1}
      ];
      ArrayHelper.add(input, {id: 1}, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test remove', function () {
      const input = [{id: 1}];
      const expected = [];
      ArrayHelper.remove(input, 0, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test up', function () {
      const input = [{id: 1}, {id: 2}];
      const expected = [{id: 2}, {id: 1}];
      ArrayHelper.up(input, 1, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);

      // moving the first up should do nothing
      ArrayHelper.up(input, 0, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test down', function () {
      const input = [{id: 1}, {id: 2}];
      const expected = [{id: 2}, {id: 1}];

      ArrayHelper.down(input, 0, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);

      // moving the last one down should do nothing
      ArrayHelper.down(input, 1, null);
      expect(input).to.be.an('array');
      expect(input).to.eql(expected);
    });

    it('test callback executed', function () {
      const input = [];
      let counter = 0;
      const callback = function () {
        counter++;
      };

      ArrayHelper.add(input, {id: 1}, callback);
      ArrayHelper.add(input, {id: 2}, callback);
      expect(counter).to.eql(2);

      ArrayHelper.up(input, 1, callback);
      expect(counter).to.eql(3);

      ArrayHelper.down(input, 0, callback);
      expect(counter).to.eql(4);

      ArrayHelper.remove(input, 1, callback);
      ArrayHelper.remove(input, 0, callback);
      expect(counter).to.eql(6);
    });
  });
});


