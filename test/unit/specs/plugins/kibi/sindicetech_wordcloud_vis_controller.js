define(function (require) {
  describe('Kibi Visualisations', function () {
    describe('word cloud', function () {

      var vis;
      var filter;

      var init;

      beforeEach(module('kibana'));
      beforeEach(inject(function (Private, $injector) {
        var Vis = Private(require('components/vis/vis'));
        var indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
        var createFilter = Private(require('components/agg_types/buckets/create_filter/terms'));

        init = function () {
          vis = new Vis(indexPattern, {
            type: 'sindicetech_wordcloud',
            aggs: [
              {
                type: 'terms',
                schema: 'segment',
                params: { field: 'machine.os' }
              }
            ]
          });

          filter = createFilter(vis.aggs[0], 'mykey');
        };
      }));

      it('creates a valid query filter', function () {
        init();

        expect(vis.type.name).to.be('sindicetech_wordcloud');
        expect(filter).to.have.property('query');
        expect(filter.query.match).to.have.property('machine.os');
        expect(filter.query.match['machine.os'].query).to.be('mykey');
        expect(filter).to.have.property('meta');
        expect(filter.meta).to.have.property('index', vis.indexPattern.id);
      });
    });
  });
});
