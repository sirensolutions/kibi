var ngMock = require('ngMock');
var shouldEntityUriBeEnabled;
var expect = require('expect.js');
var _ = require('lodash');

describe('Kibi Components', function () {
  describe('Commons', function () {


    describe('_should_entity_uri_be_enabled use query ids', function () {

      require('testUtils/noDigestPromises').activateForSuite();

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', function (Promise) {
            const queries = {
              hits: [
                {
                  id: 'goaway',
                  resultQuery: 'select name from person',
                  activationQuery: 'select name from person'
                },
                {
                  id: 'sql-result-query',
                  resultQuery: 'select name from table where id = @doc[_source][id]@'
                },
                {
                  id: 'sparql-result-query',
                  resultQuery: 'select ?name { <@doc[_source][id]@> :name ?name }'
                },
                {
                  id: 'sql-activation-query',
                  activationQuery: 'select name from table where id = @doc[_source][id]@'
                },
                {
                  id: 'sparql-activation-query',
                  resultQuery: 'ask { <@doc[_source][id]@> :name ?name }'
                },
                {
                  id: 'rest-body',
                  rest_body: '@doc[_source][id]@'
                },
                {
                  id: 'rest-params',
                  rest_params: [ { value: '@doc[_source][id]@' } ]
                },
                {
                  id: 'rest-headers',
                  rest_headers: [ { value: '@doc[_source][id]@' } ]
                },
                {
                  id: 'rest-path',
                  rest_path: '/users/@doc[_source][user]@'
                }
              ]
            };
            return {
              find: function () {
                return Promise.resolve(queries);
              },
              get: function (id) {
                var query = _.find(queries.hits, 'id', id);

                if (!query) {
                  return Promise.reject('What is this id? ' + id);
                }
                return Promise.resolve(query);
              }
            };
          });
        });

        ngMock.inject(function (Private) {
          shouldEntityUriBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));
        });
      });

      it('should not be required', function (done) {
        shouldEntityUriBeEnabled([ 'goaway' ]).then(function (required) {
          expect(required).to.be(false);
          done();
        }).catch(done);
      });

      it('should be required for SQL result query', function (done) {
        shouldEntityUriBeEnabled([ 'sql-result-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
      });

      it('should be required for SPARQL result query', function (done) {
        shouldEntityUriBeEnabled([ 'sparql-result-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
      });

      it('should be required for SQL activation query', function (done) {
        shouldEntityUriBeEnabled([ 'sql-activation-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
      });

      it('should be required for SPARQL activation query', function (done) {
        shouldEntityUriBeEnabled([ 'sparql-activation-query' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
      });

      it('should be required for REST params', function (done) {
        shouldEntityUriBeEnabled([ 'rest-params' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
      });

      it('should be required for REST headers', function (done) {
        shouldEntityUriBeEnabled([ 'rest-headers' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
      });

      it('should be required for REST path', function (done) {
        shouldEntityUriBeEnabled([ 'rest-path' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
      });

    });


    describe('_should_entity_uri_be_enabled use queries', function () {

      require('testUtils/noDigestPromises').activateForSuite();

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.inject(function (Private) {
          shouldEntityUriBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));
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
        }).catch(done);
      });

    });
  });
});
