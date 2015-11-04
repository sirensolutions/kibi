define(function (require) {
  var sparqlHelper;

  describe('Kibi Components', function () {
    describe('SPARQL Helper', function () {
      beforeEach(function () {
        module('kibana');

        inject(function ($injector, Private) {
          sparqlHelper = Private(require('components/sindicetech/sparql_helper/sparql_helper'));
        });
      });

      describe('gets variables from SPARQL queries', function () {
        it('1', function () {
          var query = 'SELECT * {' +
                        '?s ?p ?o' +
                      '}';
          expect(sparqlHelper.getVariables(query)).to.eql([ '?s', '?p', '?o' ]);
        });

        it('2', function () {
          var query = 'SELECT ?s {' +
                    '?s ?p ?o' +
                  '}';
          expect(sparqlHelper.getVariables(query)).to.eql([ '?s' ]);
        });

        it('3', function () {
          var query = 'SELECT * {' +
                      '?s a :Person .' +
                      '?s :name ?name .' +
                    '}';
          expect(sparqlHelper.getVariables(query)).to.eql([ '?s', '?name' ]);
        });

        it('4', function () {
          var query = 'SELECT * {' +
                    'graph ?g {' +
                    '  ?s a :Person .' +
                    '}' +
                  '}';
          expect(sparqlHelper.getVariables(query)).to.eql([ '?g', '?s' ]);
        });

        it('4 with placeholder', function () {
          var query = 'SELECT * WHERE {' +
                    '?s <@doc[_source][predicate]@> ?o' +
                  '}';
          expect(sparqlHelper.getVariables(query)).to.eql([ '?s', '?o' ]);
        });

      });
    });
  });
});
