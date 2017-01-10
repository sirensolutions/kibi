const util = require('../util');
const expect = require('expect.js');
const Promise = require('bluebird');
const _ = require('lodash');
const buffer = require('buffer');

describe('Json traversing', function () {
  it('delete element in array', function () {
    const json = {
      aaa: [ 1, 2 ]
    };
    const expected = {
      aaa: [ 2 ]
    };
    util.delete(json, [ 'aaa' ], '0');
    expect(json).to.eql(expected);
  });

  describe('replace that element at a given path', function () {
    it('should replace { old: 666 } with { new: 123 }', function () {
      const json = {
        aaa: {
          old: 666
        }
      };
      const expected = {
        aaa: {
          new: 123
        }
      };
      util.replace(json, [ 'aaa' ], 'old', 'new', 123);
      expect(json).to.eql(expected);
    });

    it('should replace the element in array', function () {
      const json = {
        aaa: [ 1, 2, 3 ]
      };
      const expected = {
        aaa: [ 1, 4, 3 ]
      };
      util.replace(json, [ 'aaa' ], '1', '1', 4);
      expect(json).to.eql(expected);
    });

    it('should merge arrays', function () {
      const json = {
        aaa: [ 1, 2, 3 ]
      };
      const expected = {
        aaa: [ 4, 5, 6, 1, 3 ]
      };
      util.replace(json, [ 'aaa' ], '1', '0', [ 4, 5, 6 ]);
      expect(json).to.eql(expected);
    });
  });

  it('element length', function () {
    const json = {
      aaa: [
        1,
        2,
        {
          bbb: true,
          ccc: false
        }
      ]
    };
    expect(util.length(json, [ 'aaa' ])).to.eql(3);
    expect(util.length(json, [ 'aaa', '2' ])).to.eql(2);
  });

});

describe('Error handling', function () {
  describe('with save', function () {
    it('custom query1 is wrong', function (done) {
      const query1 = {
        foo: 'bar',
        inject: 'ste'
      };
      const query2 = {
        foo: 'rab',
        inject: [{
          ham: 'ste'
        }]
      };

      const body = JSON.stringify(query1).concat('\n', JSON.stringify(query2), '\n');
      util.getQueriesAsPromise(new buffer.Buffer(body)).map(function (query) {
        util.save(query);
        return query;
      }).then(function (queries) {
        done(new Error('expected error!'));
      }).catch(function (err) {
        done();
      });
    });
  });
});
