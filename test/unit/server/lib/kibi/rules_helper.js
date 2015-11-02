var root = require('requirefrom')('');
var expect = require('expect.js');
var Promise = require('bluebird');
var queryHelper = root('src/server/lib/sindicetech/query_helper');
var sinon = require('sinon');
sinon.stub(queryHelper, 'fetchDocument').returns(
  Promise.resolve({
    _id: '_id1',
    _source: {
      id: 'id1',
      ids: ['id1', 'id2'],
      empty_id: '',
      empty_ids: []
    }
  })
);
var rulesHelper = root('src/server/lib/kibi/rules_helper');
var selectedDocuments = ['index/type/1'];


describe('Rule Helper', function () {

  describe('Evaluating rules', function () {



    describe('Matches', function () {

      it('should return true as id property exists and matches id1', function (done) {
        var rules = [
          {
            s: '@doc[_source][id]@',
            p: 'exists'
          },
          {
            s: '@doc[_source][id]@',
            p: 'matches',
            v: 'id1'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

    });

    describe('Not_empty', function () {

      it('should return true as "id" is not empty', function (done) {
        var rules = [
          {
            s: '@doc[_source][id]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

      it('should return true as "ids" is not empty', function (done) {
        var rules = [
          {
            s: '@doc[_source][ids]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

      it('should return false as "empty_id" is empty', function (done) {
        var rules = [
          {
            s: '@doc[_source][empty_id]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(false);
          done();
        });
      });

      it('should return false as "empty_ids" is empty', function (done) {
        var rules = [
          {
            s: '@doc[_source][empty_ids]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(false);
          done();
        });
      });


    });




    describe('Is_an_array', function () {

      it('should return true as ids is an array', function (done) {
        var rules = [
          {
            s: '@doc[_source][ids]@',
            p: 'is_an_array'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

    });

    describe('Length_greater_than', function () {

      it('should return true as ids is an array', function (done) {
        var rules = [
          {
            s: '@doc[_source][ids]@',
            p: 'is_an_array'
          },
          {
            s: '@doc[_source][ids]@',
            p: 'length_greater_than',
            v: '1'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

    });



    describe('Exists', function () {


      it('should return false as "not_existant" property does NOT exists', function (done) {
        var rules = [
          {
            s: '@doc[_source][not_existant]@',
            p: 'exists'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(false);
          done();
        });
      });

      it('should return true as id property exists', function (done) {
        var rules = [
          {
            s: '@doc[_source][id]@',
            p: 'exists'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });



    });
  });
});
