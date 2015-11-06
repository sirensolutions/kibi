var root = require('requirefrom')('');
var util = root('src/server/lib/sindicetech/util');
var expect = require('expect.js');
var Promise = require('bluebird');
var _ = require('lodash');
var buffer = require('buffer');

describe('Json traversing', function () {
  it('delete element in array', function () {
    var json = {
      aaa: [ 1, 2 ]
    };
    var expected = {
      aaa: [ 2 ]
    };
    util.delete(json, [ 'aaa' ], '0');
    expect(json).to.eql(expected);
  });

  describe('replace that element at a given path', function () {
    it('should replace { old: 666 } with { new: 123 }', function () {
      var json = {
        aaa: {
          old: 666
        }
      };
      var expected = {
        aaa: {
          new: 123
        }
      };
      util.replace(json, [ 'aaa' ], 'old', 'new', 123);
      expect(json).to.eql(expected);
    });

    it('should replace the element in array', function () {
      var json = {
        aaa: [ 1, 2, 3 ]
      };
      var expected = {
        aaa: [ 1, 4, 3 ]
      };
      util.replace(json, [ 'aaa' ], '1', '1', 4);
      expect(json).to.eql(expected);
    });

    it('should merge arrays', function () {
      var json = {
        aaa: [ 1, 2, 3 ]
      };
      var expected = {
        aaa: [ 4, 5, 6, 1, 3 ]
      };
      util.replace(json, [ 'aaa' ], '1', '0', [ 4, 5, 6 ]);
      expect(json).to.eql(expected);
    });
  });

  it('element length', function () {
    var json = {
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
      var query1 = {
        foo: 'bar',
        inject: 'ste'
      };
      var query2 = {
        foo: 'rab',
        inject: [{
          ham: 'ste'
        }]
      };

      var body = JSON.stringify(query1).concat('\n', JSON.stringify(query2), '\n');
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
