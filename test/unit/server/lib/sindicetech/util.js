var root = require('requirefrom')('');
var util = root('src/server/lib/sindicetech/util');
var jsonutil = require('jsonutils');
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

  it('addall', function () {
    var arr = [ 3, 4 ];
    var json = {
      aaa: [ 1, 2 ]
    };
    var expected = {
      aaa: [ 1, 2, 3, 4 ]
    };
    util.addAll(json, [ 'aaa' ], arr);
    expect(json).to.eql(expected);
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
