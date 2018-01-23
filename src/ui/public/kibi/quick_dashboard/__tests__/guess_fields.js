
import { GuessFieldsProvider } from '../guess_fields';

import { QuickDashModalsProvider } from '../quickdash_modals';
import { ProgressMapProvider } from '../progress_map';
import { QuickDashMakeVisProvider } from '../make_visualizations';

import { VisAggConfigsProvider } from 'ui/vis/agg_configs';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import { promiseMapSeries } from '../commons';

import { IndexedArray } from 'ui/indexed_array';

import expect from 'expect.js';
import _ from 'lodash';


// Test Data

const baseEsResp = {
  hits: {
    total: 1000,
    hits: null
  },
  aggregations: {
    result: {
      value: 10,
      buckets: _.times(10, () => ({ doc_count: 100 }))
    },
    min: { value: 0 },
    max: { value: 1 }
  }
};

let index;
let field;
let field2;
let field3;
let allFields;
let samplesEsResps;
let uniqueEsResps;
let termsEsResps;
let histoEsResps;

function init() {
  index = {
    id: 'indexId',
    timeFieldName: ''
  };

  field = {
    name: 'field',
    displayName: 'field',
    type: 'number',
    aggregatable: true,
    searchable: true,
    visualizable: true
  };

  field2 = _.defaults({
    name: 'field2',
    displayName: 'field2'
  }, field);

  field3 = _.defaults({
    name: 'field3',
    displayName: 'field3'
  }, field);

  allFields = [ field, field2, field3 ];

  samplesEsResps  = _.times(3).map(() => _.cloneDeep(baseEsResp));
  uniqueEsResps   = _.cloneDeep(samplesEsResps);
  termsEsResps    = _.cloneDeep(samplesEsResps);
  histoEsResps    = _.cloneDeep(samplesEsResps);
}


// Mocks

const $injector = new Map();

const savedVisualizations = {
  get({ index, type }) {
    return Promise.resolve({
      vis: {
        type: { name: type },
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
          type: {
            properties: {
              field: {
                name: 'field',
                type: 'number'
              },
              field2: {
                name: 'field2',
                type: 'number'
              },
              field3: {
                name: 'field3',
                type: 'number'
              },
              idField: {
                name: 'idField',
                type: 'keyword'
              },
            }
          }
        }
      }
    });
  }
};

const ontologyClient = {
  getRelationsByDomain(indexId) {
    if(indexId !== 'relationsTest') { return Promise.resolve([]); }

    return Promise.resolve([{
      domain: { field: 'field2' }
    }]);
  }
};

function flattenObject(obj) {
  return _.reduce(obj, function (res, val, key) {
    if(_.isObject(val)) {
      return _.assign(res, flattenObject(val));
    }

    res[key] = val;
    return res;
  }, {});
}

const es = {
  search(request) {
    const { aggs } = request.body;

    const fieldName = flattenObject(request).field;
    const allFieldNames = _.map(allFields, 'name');

    const f = _.indexOf(allFieldNames, fieldName);
    if(f < 0) { throw 'Request error'; }

    if(!aggs || aggs.min || aggs.max) {
      return Promise.resolve(samplesEsResps[f]);
    }

    switch(_.keys(aggs.result)[0]) {
      case 'cardinality':
        return Promise.resolve(uniqueEsResps[f]);

      case 'terms':
        return Promise.resolve(termsEsResps[f]);

      case 'histogram':
        return Promise.resolve(histoEsResps[f]);

      default:
        throw 'Unexpected aggregation request';
    }
  }
};

function createNotifier() {
  return { error: err => { throw err; } };
}

const Private = function (provider) {
  switch(provider) {
    case ProgressMapProvider:
      return function (arr, { valueMap }) {
        return promiseMapSeries(arr, valueMap);
      };

    case QuickDashMakeVisProvider:
      // eslint-disable-next-line new-cap
      return QuickDashMakeVisProvider(
        $injector, Private, savedVisualizations, mappings, es);

    case QuickDashModalsProvider:
      return null;

    case VisAggConfigsProvider:
      return _.noop;

    case VisTypesRegistryProvider:
      return [];

    default:
      throw 'Unexpected provider request';
  }
};

// eslint-disable-next-line new-cap
const guessFields = GuessFieldsProvider(
  Private, createNotifier, ontologyClient, mappings, es);


// Tests

function guess(fields) {
  index.fields = new IndexedArray({
    index: ['name'],
    initialSet: fields
  });

  return guessFields(index, fields, { showReport: false });
}

describe('QuickDash Guess Fields Tests', function () {
  beforeEach(init);

  it('Discards non-searchable fields', function () {
    field.searchable = false;

    return guess([ field ]).then(resFields => {
      expect(resFields.length).to.be(0);
    });
  });

  it('Discards non-aggregatable fields', function () {
    field.aggregatable = false;

    return guess([ field ]).then(resFields => {
      expect(resFields.length).to.be(0);
    });
  });

  it('Discards multifields', function () {
    field.multifields = [ field2, field3 ];

    return guess([ field, field2, field3 ])
      .then(resFields => {
        expect(resFields.length).to.be(1);
        expect(resFields[0]).to.be(field);
      });
  });

  it('Discards fields without data', function () {
    samplesEsResps[0].hits.total = 0;
    samplesEsResps[0].hits.hits = [];
    uniqueEsResps[0].aggregations.result.value = 0;

    return guess([ field ]).then(resFields => {
      expect(resFields.length).to.be(0);
    });
  });

  it('Discards fields with a single term', function () {
    uniqueEsResps[0].aggregations.result.value = 1;

    return guess([ field ]).then(resFields => {
      expect(resFields.length).to.be(0);
    });
  });

  it('Prefers fields with more non-null documents', function () {
    samplesEsResps[0].hits.total = 200;
    samplesEsResps[1].hits.total = 300;
    samplesEsResps[2].hits.total = 100;

    return guess(allFields).then(resFields => {
      expect(resFields.length).to.be(3);
      expect(resFields[0]).to.be(field2);
      expect(resFields[1]).to.be(field);
      expect(resFields[2]).to.be(field3);
    });
  });

  it('Penalizes id fields', function () {
    field.name = 'idField';
    field.type = 'keyword';

    const { total } = uniqueEsResps[0].hits;

    samplesEsResps[0].hits.hits = _.times(total, () => ({
      _source: { idField: 'someValue' }
    }));
    uniqueEsResps[0].aggregations.result.value = total;
    termsEsResps[0].aggregations.result.buckets =
      _.times(total, () => ({ doc_count: 1 }));

    return guess([ field, field2 ]).then(resFields => {
      expect(resFields.length).to.be(2);
      expect(resFields[0]).to.be(field2);
      expect(resFields[1]).to.be(field);
    });
  });

  it('Prefers relational endpoint fields', function () {
    index.id = 'relationsTest';

    return guess(allFields).then(resFields => {
      expect(resFields.length).to.be(3);
      expect(resFields[0]).to.be(field2);
    });
  });
});
