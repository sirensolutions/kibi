import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { VisProvider } from 'ui/vis';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { AggTypesBucketsCreateFilterFiltersProvider } from 'ui/agg_types/buckets/create_filter/filters';
//TODO MERGE 5.5.2 add kibi comments


describe('AggConfig Filters', function () {
  describe('filters', function () {
    let indexPattern;
    let Vis;
    let createFilter;

    beforeEach(ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
    }));
    beforeEach(ngMock.inject(function (Private) {
      Vis = Private(VisProvider);
      indexPattern = Private(FixturesStubbedLogstashIndexPatternProvider);
      createFilter = Private(AggTypesBucketsCreateFilterFiltersProvider);
    }));

    it('should return a filters filter', function () {
      const vis = new Vis(indexPattern, {
        type: 'histogram',
        aggs: [
          {
            type: 'filters',
            schema: 'segment',
            params: {
              filters: [
                { input: { query: { query_string: { query: '_type:apache' } } } },
                { input: { query: { query_string: { query: '_type:nginx' } } } }
              ]
            }
          }
        ]
      });

      const aggConfig = vis.aggs.byTypeName.filters[0];
      const filter = createFilter(aggConfig, '_type:nginx');
      expect(_.omit(filter, 'meta')).to.eql(aggConfig.params.filters[1].input);
      expect(filter.meta).to.have.property('index', indexPattern.id);

    });
    describe('kibi', function () {
      it('should separate compound query and get raw key', function () {
        const vis = new Vis(indexPattern, {
          type: 'histogram',
          aggs: [
            {
              type: 'filters',
              schema: 'segment',
              params: {
                filters: [
                  { input: { query: { query_string: { query: 'not-my-compound-query' } } } },
                  { input: { query: { query_string: { query: 'my-compound-query' } } } }
                ]
              }
            }
          ]
        });

        const aggConfig = vis.aggs.byTypeName.filters[0];
        const filter = createFilter(aggConfig, 'my-compound-query - my compound query');
        expect(_.omit(filter, 'meta')).to.eql(aggConfig.params.filters[1].input);
        expect(filter.meta).to.have.property('index', indexPattern.id);

      });
    });
  });
});
