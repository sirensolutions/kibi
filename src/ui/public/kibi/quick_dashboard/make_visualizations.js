import { VisAggConfigsProvider } from 'ui/vis/agg_configs';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

import { promiseMapSeries, fieldSpec, queryIsAnalyzed } from './commons';
import * as visTypes from './vistypes';

import _ from 'lodash';

/*
 * Adapted from multichart vis, see the Siren SDC4V papers for reference.
 */



export function QuickDashMakeVisProvider(
  $injector, Private, savedVisualizations, mappings, es) {

  const AggConfigs = Private(VisAggConfigsProvider);
  const visTypesRegistry = Private(VisTypesRegistryProvider);

  const TERM_ELEMENT_COUNT = 35;
  const TERM_ELEMENT_COUNT_4_TABLE = 100;
  const NUMERIC_HISTO_BUCKETS_COUNT = 150;

  const aggSchemasByVisType = {
    [visTypes.TABLE]: 'bucket'
  };

  const defaultParamsByVisType = {
    [visTypes.HISTOGRAM]: { addLegend: false }   // No legend, would just show 'Count'
  };


  function newDefaultVis(indexPattern, type) {
    return savedVisualizations.get({ indexPattern, type });
  }

  function configureVis(sVis, field, aggs, params) {
    sVis.title = `${field.displayName}`;

    if(aggs) { sVis.visState.aggs = new AggConfigs(sVis.vis, aggs); }

    _.merge(sVis.vis.params, params);

    return sVis;
  }

  function createVis(indexPattern, field, type, agg, xParams, params) {
    return newDefaultVis(indexPattern, type)
      .then(sVis => {
        const aggs = [{
          // Y axis
          type: 'count',
          schema: 'metric'
        }, {
          // X axis
          type: agg,
          schema: aggSchemasByVisType[type] || 'segment',
          params: _.merge({ field: field.name }, xParams)
        }];

        params = _.merge({}, defaultParamsByVisType[type] || {}, params);

        return configureVis(sVis, field, aggs, params);
      });
  }


  function searchAgg(index, aggs, query) {
    return es.search({
      index: index.id,
      ignore_unavailable: true,
      body: {
        size: 0,
        query,
        aggs
      }
    });
  }

  function evalUniqueCount(index, field, query) {
    const aggs = {
      result: {
        cardinality: _.assign({
          // Unique count is always checked against low values (10), and
          // high precision values are paid in memory usage on the server.

          precision_threshold: 20         // Doubling just to be sure
        }, fieldSpec(field))
      }
    };

    return searchAgg(index, aggs, query)
      .then(resp => resp.aggregations.result.value);
  };

  function evalNumericRange(index, field, query) {
    const fSpec = fieldSpec(field);

    const aggs = {
      min: { min: fSpec },
      max: { max: fSpec }
    };

    return searchAgg(index, aggs, query)
      .then(resp => [ resp.aggregations.min.value, resp.aggregations.max.value ]);
  }

  function evalHistoInterval(index, field, query) {
    return evalNumericRange(index, field, query)
      .then(range => {
        const floatInterval = (range[1] - range[0]) / NUMERIC_HISTO_BUCKETS_COUNT;

        // We want to convert the pure floating point interval to a somewhat
        // readable form, rounding *up* to the nearest two-digit multiple of a power
        // of 10.
        //
        // Also, imposing a minimum precision of 0 (value = 1) for integers
        // and 6 (value = 1e-6) for floats.

        let minExp;

        switch(field.esType) {
          case 'long': case 'integer': case 'short': case 'byte':
            minExp = 0;
            break;

          default:
            minExp = -6;
        }

        let exp = Math.floor(Math.log10(floatInterval)) - 1;
        exp = Math.max(exp, minExp);

        return _.ceil(floatInterval, -exp);
      });
  }

  function evalDateInterval(index, field, query) {
    const { timeFieldName } = index;

    if(field.name === timeFieldName) {
      // The index's timeField interval is best automatically calibrated based
      // on current time filter

      return Promise.resolve({ interval: 'auto' });
    }

    // Other datetime fields must be analyzed manually

    return evalNumericRange(index, field, query)
      .then(range => {
        const interval = (range[1] - range[0]) / NUMERIC_HISTO_BUCKETS_COUNT;

        // Keeping it simple - available interval specifics are explicit in
        // the following list. Year multiples are treated separately.

        const intervalSpecs = [
          { name: 'ms',     val: 1 },
          { name: '10ms',   val: 10 },
          { name: '100ms',  val: 100 },
          { name: 's',      val: 1e3 },
          { name: '5s',     val: 5e3 },
          { name: '10s',    val: 1e4 },
          { name: '20s',    val: 2e4 },
          { name: '30s',    val: 2e4 },
          { name: 'm',      val: 6e4 },
          { name: '5m',     val: 3e5 },
          { name: '10m',    val: 6e5 },
          { name: '20m',    val: 12e5 },
          { name: '30m',    val: 18e5 },
          { name: 'h',      val: 36e5 },
          { name: '3h',     val: 3 * 36e5 },
          { name: '6h',     val: 6 * 36e5 },
          { name: '12h',    val: 12 * 36e5 },
          { name: 'd',      val: 24 * 36e5 },
          { name: '5d',     val: 12 * 36e6 },
          { name: '10d',    val: 24 * 36e6 },
          { name: '15d',    val: 36 * 36e6 },
          { name: 'M',      val: 72 * 36e6 },             // Irregular months not relevant
          { name: '2M',     val: 2 * 72 * 36e6 },
          { name: '3M',     val: 3 * 72 * 36e6 },
          { name: '4M',     val: 4 * 72 * 36e6 },
          { name: '6M',     val: 6 * 72 * 36e6 },
          { name: 'y',      val: 365 * 24 * 36e5 }        // Leap years not relevant
        ];

        const upperSpecIdx = _.findIndex(intervalSpecs,
          iSpec => (interval <= iSpec.val));

        if(upperSpecIdx >= 0) {
          const upperSpec = intervalSpecs[upperSpecIdx];
          const isCustom = !Number.isNaN(Number.parseInt(upperSpec.name));

          return isCustom
            ? { interval: 'custom', customInterval: upperSpec.name }
            : { interval: upperSpec.name };
        }

        // Year multiples will be 1-digit multiples of a power of 10

        const yearSpec = intervalSpecs[intervalSpecs.length - 1];
        let multiplier = interval / yearSpec.val;

        const exp = Math.max(0, Math.floor(Math.log10(multiplier)));
        multiplier = _.ceil(multiplier, -exp);

        return { interval: 'custom', customInterval: multiplier + 'y' };
      });
  }

  function cutoffIndex(buckets, cutoffValue) {
    const bucketsCount = buckets.length;

    let current;
    let sofar;

    for(current = 0, sofar = 0; current < bucketsCount; ++current) {
      sofar += buckets[current];
      if(sofar >= cutoffValue) { break; }
    }

    return current;
  }

  function evalAgg(index, agg, query) {
    // Evaluate how many buckets it takes to cover 90% of the documents

    return searchAgg(index, { result: agg }, query)
      .then(resp => {
        const buckets = _(resp.aggregations.result.buckets)
          .map('doc_count')
          .sortBy()
          .reverse()
          .value();

        return {
          docsCount: resp.hits.total,
          buckets,
          relativeCutoff:
            cutoffIndex(buckets, 0.9 * _.sum(buckets)) / buckets.length
        };
      });
  }

  function evalHistoAgg(index, field, interval, query) {
    return evalAgg(index, {
      histogram: _.assign({
        interval
      }, fieldSpec(field))
    }, query);
  }

  function evalTermsAgg(index, field, size, query) {
    return evalAgg(index, {
      terms: _.assign({
        size,
        order: { _count: 'desc' }
      }, fieldSpec(field))
    }, query);
  }


  function analyzeNumber(index, field, query) {
    if(!field.aggregatable) { return null; }

    const retVis = createVis.bind(null, index, field);

    return evalUniqueCount(index, field, query).then(unique => {
      // Use pie if we can represent everything in 10 terms
      if(unique <= 10) {
        return retVis(visTypes.PIE, 'terms', { size: TERM_ELEMENT_COUNT });
      }

      // Otherwise, use a histogram
      let interval;

      return evalHistoInterval(index, field, query)
        .then(itl => interval = itl)
        .then(() => evalHistoAgg(index, field, interval, query))
        .then(({ relativeCutoff }) => {
          const params = {
            categoryAxes: [{
              // Numeric histograms with many buckets tend to show labels too close
              // to each other

              labels: { filter: true }    // Discards some labels when axis is crowded
            }]
          };

          if(relativeCutoff < 0.1) {     // 10% of the buckets have 90% of the documents

            // Some buckets are bound to have a far greater count than the rest.
            // This means that a non-linear scale is best, to shorten the gap.

            params.valueAxes = [{ scale: { type: 'square root' } }];
          }

          return retVis('histogram', 'histogram', { interval }, params);
        });
    });
  }

  function analyzeString(index, field, query) {
    if(!field.aggregatable) { return null; }

    const retVis = createVis.bind(null, index, field);

    return evalUniqueCount(index, field, query).then(unique => {
      // Use pie if we can represent everything in 10 terms
      if(unique <= 10) {
        return retVis(visTypes.PIE, 'terms', { size: TERM_ELEMENT_COUNT });
      }

      return Promise.all([
        evalTermsAgg(index, field, TERM_ELEMENT_COUNT_4_TABLE, query),
        queryIsAnalyzed(mappings, index, field)
      ])
      .then(([termsEval, isAnalyzed]) => {
        // Use tagcloud if type is analyzed
        if(isAnalyzed) {
          const params = (termsEval.relativeCutoff < 0.1) ? { scale: 'log' } : {};
          return retVis(visTypes.TAGCLOUD, 'terms', { size: TERM_ELEMENT_COUNT }, params);
        }


        const cutoffIdx = cutoffIndex(termsEval.buckets, 0.9 * termsEval.docsCount);

        // Use pie for 90% of the dataset in <= 10 terms
        if(cutoffIdx < 10) {
          return retVis(visTypes.PIE, 'terms', { size: TERM_ELEMENT_COUNT });
        }

        // Use histogram for 90% of the dataset in <= 50 terms
        if(cutoffIdx < 50) {
          const params = (termsEval.relativeCutoff < 0.1)
            ? { valueAxes: [{ scale: { type: 'log' } }] }
            : {};

          return retVis('histogram', 'terms', { size: 50 }, params);
        }

        // Use table otherwise
        return retVis(visTypes.TABLE, 'terms', { size: TERM_ELEMENT_COUNT_4_TABLE });
      });
    });
  }

  function analyzeDate(index, fields, dateField, query) {
    if(!dateField.aggregatable) { return null; }

    // Will show a single timeline with all numeric fields on it as distinct lines
    const numericFields = _.filter(fields, field => field.type === 'number');

    // Specialized vis with multiple aggs

    return Promise.all([
      newDefaultVis(index, visTypes.LINE),
      evalDateInterval(index, dateField, query)
    ])
    .then(([sVis, intervalParams]) => {
      const aggs = [{
        // Y-count line
        type: 'count',
        schema: 'metric'
      }].concat(numericFields.map(field => ({
        // Additional Y-lines
        type: 'avg',
        schema: 'metric',
        params: { field: field.name }
      })), [{
        // X axis
        type: 'date_histogram',
        schema: 'segment',
        params: _.assign({ field: dateField.name }, intervalParams)
      }]);

      // Clone line parameters from the count one
      const defaultSerieParams = sVis.vis.params.seriesParams[0];

      const params = {
        valueAxes: [{
          title: { text: '' }   // Remove 'Count' axis title - will host multiple lines
        }],

        seriesParams: [{}].concat(numericFields.map((field, f) => _.defaults({
          data: { id: `${f + 2}`, label: `${field.displayName}` }
        }, defaultSerieParams)))
      };

      return configureVis(sVis, dateField, aggs, params);
    });
  }

  function hasSirenDataTable() {
    return !!visTypesRegistry.find(
      visType => visType.name === visTypes.SIREN_DATA_TABLE);
  }

  function addSirenDataTable(index, fields, vises, progress) {
    if(!progress.notifyStart('Adding Siren data table')) {
      return Promise.reject(0);
    }

    const fieldNames = _(fields)
      .map('name')
      .difference(_.compact([index.timeFieldName]))     // Time field already included
      .value();

    return newDefaultVis(index, visTypes.SIREN_DATA_TABLE)
      .then(sirenDataTable => {
        configureVis(sirenDataTable, { displayName: 'Search Results' }, null, {
          columns: fieldNames
        });

        return vises.concat(sirenDataTable);
      });
  }

  function hasMultichartVis() {
    return !!visTypesRegistry.find(
      visType => visType.name === visTypes.SIREN_MULTI_CHART);
  }

  function multiChartCandidateFields(index) {
    return index.fields.filter(field =>
      field.visualizable &&
      !_.includes(index.metaFields, field.name) &&
      !field.name.endsWith('.geohash'));
  }

  function addMultichartVis(index, vises, progress) {
    const candidateFields = multiChartCandidateFields(index);
    const multiChartSDC = $injector.get('multiChartSDC');

    const analysisPromise = promiseMapSeries(candidateFields,
      field => {
        if(!progress.notifyStart(
            `Multi-Chart - Analyzing field "${field.displayName}"`)) {
          return Promise.reject(0);
        }

        return multiChartSDC(index.id, field)
          .then(sdc => ({ field, sdc }))
          .catch(_.noop);                     // Errors become undefs
      });

    return Promise.all([
      newDefaultVis(index, visTypes.SIREN_MULTI_CHART),
      analysisPromise
    ])
    .then(([ multiVis, analysis]) => {
      // Process analysis
      const fieldsData = _(analysis)
        .filter(fieldAn => fieldAn && fieldAn.sdc.vis !== 'N/A')
        .map(({ field, sdc }) => ({
          field,
          type: sdc.vis,
          aggs: new AggConfigs(multiVis.vis, sdc.aggs),
        }))
        .value();

      if(!fieldsData.length) { return vises; }

      // Choose the field to visualize by default
      const fields = fieldsData;
      const activeField = fieldsData[0].field;

      // Configure the visualization
      multiVis.title = 'Multi-Chart (All Index Fields)';

      multiVis.vis.kibiSettings = {
        activeSetting: activeField.name,
        settings: fieldsData.map(({ field, type, aggs }) => ({
          name: field.name,
          activeMode: type,
          aggs,
          modes: { [type]: { type } }
        }))
      };

      return vises.concat(multiVis);
    });
  }

  function updateVisStates(vises) {
    // Vis states need to be set manually

    vises.forEach(sVis => {
      if(!sVis) { return; }

      // Aggs need to be omitted or the vis aren't saved properly.
      // Yet unclear to me what's actually happening there.

      _.assign(sVis.visState, _.omit(sVis.vis.getEnabledState(), 'aggs'));
    });

    return vises;
  }


  return {
    makeSavedVisualizations(index, fields, options = {}) {
      _.defaults(options, {
        query: {},
        addSirenDataTable: true,
        addSirenMultiChart: true,
        progress: { notifyStart: _.constant(true) }
      });

      const { query, progress } = options;

      return promiseMapSeries(fields, field => {
        if(!progress.notifyStart(`Analyzing field "${field.displayName}"`)) {
          return Promise.reject(0);
        }

        let output;

        switch (field.type) {
          case 'number':
            output = analyzeNumber(index, field, query);
            break;

          case 'string':
          case 'text':
          case 'keyword':
            output = analyzeString(index, field, query);
            break;

          case 'date':
            output = analyzeDate(index, fields, field, query);
            break;

          case 'boolean':
            output = createVis(index, field, visTypes.PIE, 'terms', { size: 2 });
            break;

          case 'geo_point':
            output = createVis(index, field, visTypes.TILE_MAP, 'geohash_grid');
            break;

          default:
            output = null;
        }

        return output;
      })
      .then(vises => options.addSirenDataTable && hasSirenDataTable()
        ? addSirenDataTable(index, fields, vises, progress)
        : vises)
      .then(vises => options.addSirenMultiChart && hasMultichartVis()
        ? addMultichartVis(index, vises, progress)
        : vises)
      .then(updateVisStates);
    },

    analysisStepsCount(index, fields, options = {}) {
      _.defaults(options, {
        addSirenDataTable: true,
        addSirenMultiChart: true
      });


      let result = fields.length;

      if(options.addSirenDataTable && hasSirenDataTable()) {
        result += 1;
      }

      if(options.addSirenMultiChart && hasMultichartVis()) {
        result += multiChartCandidateFields(index).length;
      }

      return result;
    }
  };
}

