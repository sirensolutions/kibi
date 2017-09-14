import { ShouldEntityURIBeEnabledFactory } from 'ui/kibi/components/commons/_should_entity_uri_be_enabled';
import noDigestPromises from 'test_utils/no_digest_promises';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import _ from 'lodash';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';

let shouldEntityUriBeEnabled;

describe('Kibi Components', function () {
  describe('Commons', function () {

    describe('_should_entity_uri_be_enabled use query ids', function () {

      noDigestPromises.activateForSuite();

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.module('queries_editor/services/saved_queries', function ($provide) {
          $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries', [
            {
              id: 'goaway',
              resultQuery: 'select name from person',
              activationQuery: 'select name from person'
            },
            {
              id: 'sql-query-comment-depends',
              resultQuery: `select name
                            from table
                            /* where id = @doc[_source][name]@ */
                            where id = @doc[_source][id]@`
            },
            {
              id: 'sql-query-comment-depends-not',
              resultQuery: `select name
                            from table
                            /* where id = @doc[_source][name]@ */
                            where id = 123`
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
          ]));
        });

        ngMock.inject(function (Private) {
          shouldEntityUriBeEnabled = Private(ShouldEntityURIBeEnabledFactory);
        });
      });

      it('should not require if no argument is passed', function (done) {
        shouldEntityUriBeEnabled().then(function (required) {
          expect(required).to.be(false);
          done();
        }).catch(done);
      });

      it('should not require if array has no defined queries', function (done) {
        shouldEntityUriBeEnabled([ '' ]).then(function (required) {
          expect(required).to.be(false);
          done();
        }).catch(done);
      });

      it('should not require entity that is commented', function (done) {
        shouldEntityUriBeEnabled([ 'sql-query-comment-depends-not' ]).then(function (required) {
          expect(required).to.be(false);
          done();
        }).catch(done);
      });

      it('should require entity that is not commented', function (done) {
        shouldEntityUriBeEnabled([ 'sql-query-comment-depends' ]).then(function (required) {
          expect(required).to.be(true);
          done();
        }).catch(done);
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
  });
});
