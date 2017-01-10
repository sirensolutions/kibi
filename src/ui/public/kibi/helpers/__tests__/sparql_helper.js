import SparqlHelperProvider from 'ui/kibi/helpers/sparql_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';

let sparqlHelper;

describe('Kibi Components', function () {

  describe('SPARQL Helper', function () {

    beforeEach(function () {
      ngMock.module('kibana');
      ngMock.inject(function ($injector, Private) {
        sparqlHelper = Private(SparqlHelperProvider);
      });
    });

    describe('gets variables from SPARQL queries', function () {
      const queries = [
        {
          query: `SELECT * {
                    ?s ?p ?o
                  }`,
          expectedVariables: [ '?s', '?p', '?o' ]
        },
        {
          query: `SELECT ?s {
                    ?s ?p ?o
                  }`,
          expectedVariables: [ '?s' ]
        },
        {
          query: `SELECT * {
                    ?s a :Person .
                    ?s :name ?name .
                  }`,
          expectedVariables: [ '?s', '?name' ]
        },
        {
          query: `SELECT * {
                    graph ?g {
                      ?s a :Person .
                    }
                  }`,
          expectedVariables: [ '?g', '?s' ]
        },
        {
          query: `SELECT * {
                    ?s <@doc[_source][predicate]@> ?o
                  }`,
          expectedVariables: [ '?s', '?o' ]
        },
        {
          query: `SELECT * {
                    ?s ?p '@doc[_source][object]@'
                  }`,
          expectedVariables: [ '?s', '?p' ]
        },
        {
          query: `SELECT * {
                    ?s ?p "@doc[_source][object]@"
                  }`,
          expectedVariables: [ '?s', '?p' ]
        },
        {
          query: `SELECT * {
                    ?s ?p @doc[_source][object]@
                  }`,
          expectedVariables: [ '?s', '?p' ]
        },
        {
          query: `SELECT * {
                    ?s ?p <@doc[_source][object]@
                  }`,
          expectToThrow: true
        }
      ];

      const testQuery = function (queryDef) {
        if (queryDef.expectToThrow) {
          expect(sparqlHelper.getVariables).withArgs(queryDef.query).to.throwError();
        } else {
          expect(sparqlHelper.getVariables(queryDef.query)).to.eql(queryDef.expectedVariables);
        }
      };

      for (let i = 0; i < queries.length; i++) {
        it(queries[i].query, testQuery.bind(this, queries[i]));
      }
    });
  });
});
