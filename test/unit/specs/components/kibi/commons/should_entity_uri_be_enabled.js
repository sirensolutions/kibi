define(function (require) {
  var shouldEntityUriBeEnabled;

  describe('Kibi Components', function () {
    describe('Commons', function () {


      describe('_should_entity_uri_be_enabled use query ids', function () {

        require('test_utils/no_digest_promises').activateForSuite();

        beforeEach(function () {
          module('kibana');

          module('queries_editor/services/saved_queries', function ($provide) {
            $provide.service('savedQueries', function (Promise) {
              return {
                get: function (id) {
                  var query;

                  switch (id) {
                    case 'goaway':
                      query = {
                        st_resultQuery: 'select name from person',
                        st_activationQuery: 'select name from person'
                      };
                      break;
                    case 'sql-result-query':
                      query = {
                        st_resultQuery: 'select name from table where id = @doc[_source][id]@'
                      };
                      break;
                    case 'sparql-result-query':
                      query = {
                        st_resultQuery: 'select ?name { <@doc[_source][id]@> :name ?name }'
                      };
                      break;
                    case 'sql-activation-query':
                      query = {
                        st_activationQuery: 'select name from table where id = @doc[_source][id]@'
                      };
                      break;
                    case 'sparql-activation-query':
                      query = {
                        st_resultQuery: 'ask { <@doc[_source][id]@> :name ?name }'
                      };
                      break;
                    case 'rest-body':
                      query = {
                        rest_body: '@doc[_source][id]@'
                      };
                      break;
                    case 'rest-params':
                      query = {
                        rest_params: [ { value: '@doc[_source][id]@' } ]
                      };
                      break;
                    case 'rest-headers':
                      query = {
                        rest_headers: [ { value: '@doc[_source][id]@' } ]
                      };
                      break;
                    case 'rest-path':
                      query = {
                        rest_path: '/users/@doc[_source][user]@'
                      };
                      break;
                    default:
                      return Promise.reject('What is this id? ' + id);
                  }
                  return Promise.resolve(query);
                }
              };
            });
          });

          inject(function (Private) {
            shouldEntityUriBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));
          });
        });

        it('should not be required', function (done) {
          shouldEntityUriBeEnabled([ 'goaway', '' ]).then(function (required) {
            expect(required).to.be(false);
            done();
          });
        });

        it('should be required for SQL result query', function (done) {
          shouldEntityUriBeEnabled([ 'sql-result-query' ]).then(function (required) {
            expect(required).to.be(true);
            done();
          });
        });

        it('should be required for SPARQL result query', function (done) {
          shouldEntityUriBeEnabled([ 'sparql-result-query' ]).then(function (required) {
            expect(required).to.be(true);
            done();
          });
        });

        it('should be required for SQL activation query', function (done) {
          shouldEntityUriBeEnabled([ 'sql-activation-query' ]).then(function (required) {
            expect(required).to.be(true);
            done();
          });
        });

        it('should be required for SPARQL activation query', function (done) {
          shouldEntityUriBeEnabled([ 'sparql-activation-query' ]).then(function (required) {
            expect(required).to.be(true);
            done();
          });
        });

        it('should be required for REST params', function (done) {
          shouldEntityUriBeEnabled([ 'rest-params' ]).then(function (required) {
            expect(required).to.be(true);
            done();
          });
        });

        it('should be required for REST headers', function (done) {
          shouldEntityUriBeEnabled([ 'rest-headers' ]).then(function (required) {
            expect(required).to.be(true);
            done();
          });
        });

        it('should be required for REST path', function (done) {
          shouldEntityUriBeEnabled([ 'rest-path' ]).then(function (required) {
            expect(required).to.be(true);
            done();
          });
        });

      });


      describe('_should_entity_uri_be_enabled use queries', function () {

        require('test_utils/no_digest_promises').activateForSuite();

        beforeEach(function () {
          module('kibana');

          inject(function (Private) {
            shouldEntityUriBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));
          });
        });

        it('single query should return true', function (done) {

          var query = {
            rest_params: [
              {name: 'param1', value: '@doc[_source][id]@'}
            ]
          };

          shouldEntityUriBeEnabled(null, [query]).then(function (required) {
            expect(required).to.be(true);
            done();
          }).catch(done);

        });

        it('single query should return false', function (done) {
          var query = {
            rest_params: [
              {name: 'param1', value: 'id'}
            ]
          };

          shouldEntityUriBeEnabled(null, [ 'select * from table1 where 1 limit 10' ]).then(function (required) {
            expect(required).to.be(false);
            done();
          });
        });

      });
    });
  });
});
