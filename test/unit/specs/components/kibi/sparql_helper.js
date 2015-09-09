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

      it('gets variables from SPARQL queries', function () {
        var query = 'SELECT * {' +
                      '?s ?p ?o' +
                    '}';
        expect(sparqlHelper.getVariables(query)).to.eql([ '?s', '?p', '?o' ]);

        query = 'SELECT ?s {' +
                  '?s ?p ?o' +
                '}';
        expect(sparqlHelper.getVariables(query)).to.eql([ '?s' ]);

        query = 'SELECT * {' +
                  '?s a :Person .' +
                  '?s :name ?name .' +
                '}';
        expect(sparqlHelper.getVariables(query)).to.eql([ '?s', '?name' ]);

        query = 'SELECT * {' +
                  'graph ?g {' +
                  '  ?s a :Person .' +
                  '}' +
                '}';
        expect(sparqlHelper.getVariables(query)).to.eql([ '?g', '?s' ]);
      });
    });
  });
});
