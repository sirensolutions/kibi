import * as visTypes from '../vistypes';
import { QuickDashMakeVisProvider } from '../make_visualizations';

import { VisAggConfigsProvider } from 'ui/vis/agg_configs';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import { IndexedArray } from 'ui/indexed_array';

import expect from 'expect.js';
import _ from 'lodash';


// Test Data

const additionalVisTypes = [];

const baseEsResp = {
  hits: {
    total: 0,
  },
  aggregations: {
    result: {},
    min: { value: 0 },
    max: { value: 1 }
  }
};

let indexPattern;
let field;
let field2;
let minMaxEsResp;
let uniqueEsResp;
let termsEsResp;

const histoEsResp = _.cloneDeep(baseEsResp);
histoEsResp.aggregations.result.buckets =
  _.times(50, _.constant({ doc_count: 100 }));


// Mocks

class AggConfigs {
  constructor(vis, config) {
    this.vis = vis;
    this.config = config;
  }
}

const Private = function (provider) {
  switch(provider) {
    case VisAggConfigsProvider:
      return AggConfigs;

    case VisTypesRegistryProvider:
      return additionalVisTypes;

    default:
      throw 'Unexpected provider request';
  }
};

const $injector = new Map(_.pairs({
  multiChartSDC() {
    return Promise.resolve({ field, sdc: { vis: 'something' } });
  }
}));

const savedVisualizations = {
  get({ indexPattern, type }) {
    return Promise.resolve({
      type,
      vis: {
        params: {
          valueAxes: [{}],
          seriesParams: [{}]
        },
        getEnabledState() { return {}; }
      },
      visState: {},
    });
  }
};

const mappings = {
  getMapping() {
    return Promise.resolve({
      theIndex: {
        mappings: {
          theType: {
            properties: {
              longField: {
                name: 'longField',
                type: 'long'
              },
              textField: {
                name: 'textField',
                type: 'text'
              },
              analyzedStringField: {
                name: 'analyzedStringField',
                type: 'string',
                index: true
              },
              notAnalyzedStringField: {
                name: 'notAnalyzedStringField',
                type: 'string',
                index: 'not_analyzed'
              },
              keywordField: {
                name: 'keywordField',
                type: 'keyword'
              },
            }
          }
        }
      }
    });
  }
};

const es = {
  search(request) {
    const aggs = request.body.aggs;

    if(aggs.min && aggs.max) {
      return Promise.resolve(minMaxEsResp);
    }

    switch(_.keys(aggs.result)[0]) {
      case 'cardinality':
        return Promise.resolve(uniqueEsResp);

      case 'terms':
        return Promise.resolve(termsEsResp);

      case 'histogram':
        return Promise.resolve(histoEsResp);

      default:
        throw 'Unexpected aggregation request';
    }
  }
};


// NOTE: I couldn't find a way to use ngMock to both inject *and*
// mock Private - so we're scratching that and go for the easier
// 'positional' way without ngMock.

// eslint-disable-next-line new-cap
const visBuilder = QuickDashMakeVisProvider(
  $injector, Private, savedVisualizations, mappings, es
).makeSavedVisualizations;


function initTest() {
  additionalVisTypes.length = 0;

  field = {
    name: 'field',
    displayName: 'field',
    type: undefined,
    esType: undefined,
    aggregatable: true,
    visualizable: true
  };

  field2 = _.cloneDeep(field);

  indexPattern = {
    timeFieldName: '',
    fields: new IndexedArray({
      index: ['name'],
      initialSet: [ field, field2 ]
    })
  };

  field.indexPattern = field2.indexPattern = indexPattern;

  minMaxEsResp = _.cloneDeep(baseEsResp);
  uniqueEsResp = _.cloneDeep(baseEsResp);
  termsEsResp = _.cloneDeep(baseEsResp);
}


// Tests

describe('QuickDashboard Visualization Tests', function () {
  beforeEach(initTest);

  describe('Bad fields', function () {
    it('Returns nulls for unknown field types', function () {
      field.name = 'unknownField';
      field.type = 'unknown';
      field.esType = 'unknown';

      return visBuilder(indexPattern, [ field ])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0]).to.be(null);
        });
    });

    it('Returns nulls for not-aggregatable fields', function () {
      field.aggregatable = false;

      function doTest(fieldType, fieldEsType = fieldType) {
        field.type = fieldType;
        field.esType = fieldEsType;

        return visBuilder(indexPattern, [ field ])
          .then(vises => {
            expect(vises.length).to.be(1);
            expect(vises[0]).to.be(null);
          });
      }

      return Promise.resolve()
        .then(() => doTest('string'))
        .then(() => doTest('number', 'long'))
        .then(() => doTest('date'))
        .then(() => doTest('boolean'))
        .then(() => doTest('geo_point'));
    });
  });

  describe('String fields', function () {
    it('Returns a pie with few uniques', function () {
      uniqueEsResp.aggregations.result.value = 5;

      field.type = 'string';
      field.esType = 'string';

      return visBuilder(indexPattern, [ field ])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.PIE);
        });
    });

    it('Returns cloud tag if field is analyzed', function () {
      uniqueEsResp.aggregations.result.value = 1e3;

      termsEsResp.hits.total = 5000;
      termsEsResp.aggregations.result.buckets =
        _.times(50, _.constant({ doc_count: 100 }));

      field.name = 'textField';
      field.type = 'string';

      field2.name = 'analyzedStringField';
      field2.type = 'string';

      return visBuilder(indexPattern, [ field, field2 ])
        .then(vises => {
          expect(vises.length).to.be(2);
          expect(vises[0].type).to.be(visTypes.TAGCLOUD);
          expect(vises[1].type).to.be(visTypes.TAGCLOUD);
        });
    });

    it('Returns histogram for ~50 bucket counts', function () {
      uniqueEsResp.aggregations.result.value = 50;

      termsEsResp.hits.total = 5000;
      termsEsResp.aggregations.result.buckets =
        _.times(50, _.constant({ doc_count: 100 }));

      field.name = 'notAnalyzedStringField';
      field.type = 'string';
      field2.esType = 'string';

      field2.name = 'keywordField';
      field2.type = 'string';
      field2.esType = 'keyword';

      return visBuilder(indexPattern, [ field, field2 ])
        .then(vises => {
          expect(vises.length).to.be(2);
          expect(vises[0].type).to.be(visTypes.HISTOGRAM);
          expect(vises[1].type).to.be(visTypes.HISTOGRAM);
        });
    });

    it('Returns table for id-like fields', function () {
      uniqueEsResp.aggregations.result.value = 1e3;

      termsEsResp.hits.total = 1e3;
      termsEsResp.aggregations.result.buckets =
        _.times(1e3, _.constant({ doc_count: 1 }));

      field.name = 'notAnalyzedStringField';
      field.type = 'string';
      field.esType = 'string';

      field2.name = 'keywordField';
      field2.type = 'string';
      field2.esType = 'keyword';

      return visBuilder(indexPattern, [ field, field2 ])
        .then(vises => {
          expect(vises.length).to.be(2);
          expect(vises[0].type).to.be(visTypes.TABLE);
          expect(vises[1].type).to.be(visTypes.TABLE);
        });
    });
  });

  describe('Number fields', function () {
    it('Returns a pie with few uniques', function () {
      uniqueEsResp.aggregations.result.value = 5;

      field.type = 'number';
      field.esType = 'float';

      return visBuilder(indexPattern, [ field ])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.PIE);
        });
    });

    it('Returns histogram otherwise', function () {
      field.type = 'number';
      field.esType = 'long';

      function doTest(uniques) {
        return function () {
          uniqueEsResp.aggregations.result.value = uniques;

          return visBuilder(indexPattern, [ field ])
            .then(vises => {
              expect(vises.length).to.be(1);
              expect(vises[0].type).to.be(visTypes.HISTOGRAM);
            });
        };
      }

      return Promise.resolve()
        .then(() => doTest(50))
        .then(() => doTest(500))
        .then(() => doTest(5e3))
        .then(() => doTest(5e4));
    });

    it('Has histo interval >=1 for integer types', function () {
      field.name = 'longField';
      field.type = 'number';
      minMaxEsResp.aggregations.min.value = -1;
      minMaxEsResp.aggregations.max.value = 1;

      return visBuilder(indexPattern, [ field ])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.HISTOGRAM);
          expect(vises[0].visState.aggs.config[1].params.interval)
            .to.be(1);
        });
    });
  });

  describe('Date fields', function () {
    it('Returns line chart', function () {
      field.type = 'date';
      field.esType = 'date';

      return visBuilder(indexPattern, [ field ])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.LINE);
        });
    });
  });

  describe('Bool fields', function () {
    it('Returns pie chart', function () {
      field.type = 'boolean';
      field.esType = 'boolean';

      return visBuilder(indexPattern, [ field ])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.PIE);
        });
    });
  });

  describe('GeoPoint fields', function () {
    it('Returns tile_map chart', function () {
      field.type = 'geo_point';
      field.esType = 'geo_point';

      return visBuilder(indexPattern, [ field ])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.TILE_MAP);
        });
    });
  });

  describe('Additional visualizations', function () {
    it('Will add Kibi Data Table if available', function () {
      additionalVisTypes.push({ name: visTypes.SIREN_DATA_TABLE });

      return visBuilder(indexPattern, [])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.SIREN_DATA_TABLE);
        });
    });

    it('Will add Kibi Multi-Chart if available', function () {
      additionalVisTypes.push({ name: visTypes.SIREN_MULTI_CHART });

      return visBuilder(indexPattern, [])
        .then(vises => {
          expect(vises.length).to.be(1);
          expect(vises[0].type).to.be(visTypes.SIREN_MULTI_CHART);
        });
    });
  });
});

