import expect from 'expect.js';
import Promise from 'bluebird';
import RulesHelper from '../rules_helper';

const selectedDocuments = ['index/type/1'];

const fakeServer = {
  log: function (tags, data) {},
  config() {
    return {
      get(key) {
        if (key === 'elasticsearch.url') {
          return 'http://localhost:12345';
        } else if (key === 'kibana.index') {
          return '.kibi';
        } else {
          return '';
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      getCluster() {
        return {
          getClient() {
            return {
              search() {
                return Promise.resolve({
                  hits: {
                    hits: [
                      {
                        _id: '_id1',
                        _source: {
                          id: 'id1',
                          ids: ['id1', 'id2'],
                          empty_id: '',
                          empty_ids: [],
                          age: 37,
                          zero: 0,
                          null_field: null,
                          undefined_field: undefined
                        }
                      }
                    ]
                  }
                });
              }
            };
          }
        };
      },
    }
  }
};

const rulesHelper = new RulesHelper(fakeServer);

describe('Rule Helper', function () {

  describe('Evaluating rules', function () {

    describe('Matches', function () {

      it('should return true as id property exists and matches id1', function (done) {
        const rules = [
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
        }).catch(done);

      });

    });

    describe('Not_empty', function () {

      it('should return true as "age" is not empty integer', function (done) {
        const rules = [
          {
            s: '@doc[_source][age]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

      it('should return true as "zero" is not empty integer', function (done) {
        const rules = [
          {
            s: '@doc[_source][zero]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

      it('should return false as "null_field" is property with null value', function (done) {
        const rules = [
          {
            s: '@doc[_source][null_field]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(false);
          done();
        });
      });

      it('should return false as "undefined_field" is property with undefined value', function (done) {
        const rules = [
          {
            s: '@doc[_source][undefined_field]@',
            p: 'is_not_empty'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(false);
          done();
        });
      });


      it('should return true as "id" is not empty', function (done) {
        const rules = [
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
        const rules = [
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
        const rules = [
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
        const rules = [
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
        const rules = [
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

      it('should return true as ids is an array with 2 values', function (done) {
        const rules = [
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

      it('should return true as id value is 3 characters long', function (done) {
        const rules = [
          {
            s: '@doc[_source][id]@',
            p: 'length_greater_than',
            v: '2'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(true);
          done();
        });
      });

      it('should return false as age is an integer', function (done) {
        const rules = [
          {
            s: '@doc[_source][age]@',
            p: 'length_greater_than',
            v: '2'
          }
        ];

        rulesHelper.evaluate(rules, selectedDocuments).then(function (res) {
          expect(res).to.equal(false);
          done();
        });
      });

    });


    describe('Exists', function () {

      it('should return false as "not_existant" property does NOT exists', function (done) {
        const rules = [
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
        const rules = [
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
