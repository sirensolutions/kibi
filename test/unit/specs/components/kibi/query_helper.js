define(function (require) {
  var _ = require('lodash');

  var $rootScope;
  var queryHelper;

  function init() {
    return function () {
      module('kibana');

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        queryHelper = Private(require('components/sindicetech/query_helper/query_helper'));
      });
    };
  }

  describe('Kibi Components', function () {
    beforeEach(init());

    describe('queryHelper', function () {

      it('should output correct join label 1', function (done) {
        var focus = 'a';
        var relations = [
          [ 'a.id', 'b.id' ],
          [ 'b.id', 'c.id' ],
          [ 'd.id', 'e.id' ]
        ];
        var expected = 'a <-> b <-> c';

        queryHelper.constructJoinFilter(focus, null, relations, null).then(function (join) {
          expect(join.meta.value).to.be(expected);
          done();
        }).catch(function (err) {
          done(err);
        });

        $rootScope.$apply();
      });

      it('should output correct join label 2', function (done) {
        var focus = 'a';
        var relations = [
          [ 'a.id', 'b.id' ],
          [ 'b.id', 'c.id' ],
          [ 'c.id', 'd.id' ]
        ];
        var expected = 'a <-> b <-> c <-> d';
        queryHelper.constructJoinFilter(focus, null, relations, null).then(function (join) {
          expect(join.meta.value).to.be(expected);
          done();
        }).catch(function (err) {
          done(err);
        });

        $rootScope.$apply();
      });

      it('should output correct join label 3', function (done) {
        var focus = 'a';
        var relations = [
          [ 'a.id', 'b.id' ],
          [ 'b.id', 'b.id' ]
        ];
        var expected = 'a <-> b';
        queryHelper.constructJoinFilter(focus, null, relations, null).then(function (join) {
          expect(join.meta.value).to.be(expected);
          done();
        }).catch(function (err) {
          done(err);
        });

        $rootScope.$apply();
      });

    });
  });
});
