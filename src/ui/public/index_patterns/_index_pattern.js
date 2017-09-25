import _ from 'lodash';
import { SavedObjectNotFound, DuplicateField, IndexPatternMissingIndices } from 'ui/errors';
import angular from 'angular';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import UtilsMappingSetupProvider from 'ui/utils/mapping_setup';
import { Notifier } from 'ui/notify';

import { getComputedFields } from './_get_computed_fields';
import { formatHit } from './_format_hit';
import { IndexPatternsGetIdsProvider } from './_get_ids';
import { IndexPatternsIntervalsProvider } from './_intervals';
import { IndexPatternsFieldListProvider } from './_field_list';
import { IndexPatternsFlattenHitProvider } from './_flatten_hit';
import { IndexPatternsCalculateIndicesProvider } from './_calculate_indices';
import { IndexPatternsPatternCacheProvider } from './_pattern_cache';
import { FieldsFetcherProvider } from './fields_fetcher_provider';

// kibi: imports
import { IndexPatternsMapperProvider } from 'ui/index_patterns/_mapper';
import { SavedObjectSourceFactory } from 'ui/courier/data_source/savedobject_source'; // kibi: use the SavedObjectSource as DocSource
// kibi: end

// kibi: added mappings service dependency
export function IndexPatternProvider(Private, createNotifier, config, kbnIndex, Promise, confirmModalPromise, mappings) {
  const fieldformats = Private(RegistryFieldFormatsProvider);
  const getIds = Private(IndexPatternsGetIdsProvider);
  const fieldsFetcher = Private(FieldsFetcherProvider);
  const intervals = Private(IndexPatternsIntervalsProvider);
  const DocSource = Private(SavedObjectSourceFactory);
  const mappingSetup = Private(UtilsMappingSetupProvider);
  const FieldList = Private(IndexPatternsFieldListProvider);
  const flattenHit = Private(IndexPatternsFlattenHitProvider);
  const calculateIndices = Private(IndexPatternsCalculateIndicesProvider);
  const patternCache = Private(IndexPatternsPatternCacheProvider);
  const type = 'index-pattern';
  // kibi: adds mapper
  const mapper = Private(IndexPatternsMapperProvider);
  const notify = createNotifier();
  const configWatchers = new WeakMap();
  const docSources = new WeakMap();
  const getRoutes = () => ({
    edit: '/management/siren/indices/{{id}}',
    addField: '/management/siren/indices/{{id}}/create-field',
    indexedFields: '/management/siren/indices/{{id}}?_a=(tab:indexedFields)',
    scriptedFields: '/management/siren/indices/{{id}}?_a=(tab:scriptedFields)',
    sourceFilters: '/management/siren/indices/{{id}}?_a=(tab:sourceFilters)'
  });

  const mapping = mappingSetup.expandShorthand({
    title: 'string',
    timeFieldName: 'string',
    notExpandable: 'boolean',
    intervalName: 'string',
    fields: 'json',
    sourceFilters: 'json',
    paths: 'json', // kibi: store the path of each field, in order to support dotted field names
    fieldFormatMap: {
      type: 'string',
      _serialize(map = {}) {
        const serialized = _.transform(map, serializeFieldFormatMap);
        return _.isEmpty(serialized) ? undefined : angular.toJson(serialized);
      },
      _deserialize(map = '{}') {
        return _.mapValues(angular.fromJson(map), deserializeFieldFormatMap);
      }
    }
  });

  function serializeFieldFormatMap(flat, format, field) {
    if (format) {
      flat[field] = format;
    }
  }

  function deserializeFieldFormatMap(mapping) {
    const FieldFormat = fieldformats.byId[mapping.id];
    return FieldFormat && new FieldFormat(mapping.params);
  }

  function updateFromElasticSearch(indexPattern, response) {
    if (!response.found) {
      throw new SavedObjectNotFound(type, indexPattern.id);
    }

    _.forOwn(mapping, (fieldMapping, name) => {
      if (!fieldMapping._deserialize) {
        return;
      }
      response._source[name] = fieldMapping._deserialize(
        response._source[name], response, name, fieldMapping
      );
    });

    // give index pattern all of the values in _source
    _.assign(indexPattern, response._source);

    const promise = indexFields(indexPattern);

    // any time index pattern in ES is updated, update index pattern object
    // kibi: Check docSources has that indexPattern key
    if (docSources.has(indexPattern)) {
      docSources
      .get(indexPattern)
      .onUpdate()
      .then(response => updateFromElasticSearch(indexPattern, response), notify.fatal);
    }

    return promise;
  }

  function isFieldRefreshRequired(indexPattern) {
    if (!indexPattern.fields) {
      return true;
    }

    return indexPattern.fields.every(field => {
      // See https://github.com/elastic/kibana/pull/8421
      const hasFieldCaps = ('aggregatable' in field) && ('searchable' in field);

      // See https://github.com/elastic/kibana/pull/11969
      const hasDocValuesFlag = ('readFromDocValues' in field);

      return !hasFieldCaps || !hasDocValuesFlag;
    });
  }

  function indexFields(indexPattern) {
    let promise = Promise.resolve();

    if (!indexPattern.id) {
      return promise;
    }

    if (isFieldRefreshRequired(indexPattern)) {
      promise = indexPattern.refreshFields();
    }
    return promise.then(() => {initFields(indexPattern);});
  }

  function setId(indexPattern, id) {
    indexPattern.id = id;
    return id;
  }

  function watch(indexPattern) {
    if (configWatchers.has(indexPattern)) {
      return;
    }
    const unwatch = config.watchAll(() => {
      if (indexPattern.fields) {
        initFields(indexPattern); // re-init fields when config changes, but only if we already had fields
      }
    });
    configWatchers.set(indexPattern, { unwatch });
  }

  function unwatch(indexPattern) {
    if (!configWatchers.has(indexPattern)) {
      return;
    }
    configWatchers.get(indexPattern).unwatch();
    configWatchers.delete(indexPattern);
  }

  function initFields(indexPattern, input) {
    // kibi: if paths not fetched yet do it first
    let promise = Promise.resolve();
    if (!indexPattern.kibiPathsFetched) {
      promise = indexPattern._fetchFieldsPath();
    }
    return promise.then(() => {
      const oldValue = indexPattern.fields;
      const newValue = input || oldValue || [];
      indexPattern.fields = new FieldList(indexPattern, newValue);
    });

    const oldValue = indexPattern.fields;
    const newValue = input || oldValue || [];
    indexPattern.fields = new FieldList(indexPattern, newValue);
  }

  function fetchFields(indexPattern) {
    return Promise.resolve()
    .then(() => fieldsFetcher.fetch(indexPattern))
    .then(fields => {
      const scripted = indexPattern.getScriptedFields();
      const all = fields.concat(scripted);
      // kibi: return this
      return initFields(indexPattern, all);
    });
  }

  class IndexPattern {
    constructor(id) {
      setId(this, id);
      docSources.set(this, new DocSource());

      this.metaFields = config.get('metaFields');
      this.getComputedFields = getComputedFields.bind(this);

      this.flattenHit = flattenHit(this);
      this.formatHit = formatHit(this, fieldformats.getDefaultInstance('string'));
      this.formatField = this.formatHit.formatField;
    }

    get routes() {
      return getRoutes();
    }

    init() {
      docSources
      .get(this)
      .index(kbnIndex)
      .type(type)
      .id(this.id);

      watch(this);

      return mappingSetup
      .isDefined(type)
      .then(defined => {
        if (defined) {
          return true;
        }
        return mappingSetup.setup(type, mapping);
      })
      .then(() => {
        if (!this.id) {
          return; // no id === no elasticsearch document
        }
        return docSources.get(this)
        .fetch()
        .then(response => updateFromElasticSearch(this, response));
      })
      .then(() => this);
    }

    // Get the source filtering configuration for that index.
    getSourceFiltering() {
      return {
        excludes: this.sourceFilters && this.sourceFilters.map(filter => filter.value) || []
      };
    }

    addScriptedField(name, script, type = 'string', lang) {
      const scriptedFields = this.getScriptedFields();
      const names = _.pluck(scriptedFields, 'name');

      if (_.contains(names, name)) {
        throw new DuplicateField(name);
      }

      this.fields.push({
        name: name,
        script: script,
        type: type,
        scripted: true,
        lang: lang
      });

      this.save();
    }

    removeScriptedField(name) {
      const fieldIndex = _.findIndex(this.fields, {
        name: name,
        scripted: true
      });
      this.fields.splice(fieldIndex, 1);
      this.save();
    }

    popularizeField(fieldName, unit = 1) {
      const field = _.get(this, ['fields', 'byName', fieldName]);
      if (!field) {
        return;
      }
      const count = Math.max((field.count || 0) + unit, 0);
      if (field.count === count) {
        return;
      }
      field.count = count;
      this.save();
    }

    getNonScriptedFields() {
      return _.where(this.fields, { scripted: false });
    }

    getScriptedFields() {
      return _.where(this.fields, { scripted: true });
    }

    getInterval() {
      return this.intervalName && _.find(intervals, { name: this.intervalName });
    }

    toIndexList(start, stop, sortDirection) {
      return this
        .toDetailedIndexList(start, stop, sortDirection)
        .then(detailedIndices => {
          if (!_.isArray(detailedIndices)) {
            return detailedIndices.index;
          }
          return _.pluck(detailedIndices, 'index');
        });
    }

    toDetailedIndexList(start, stop, sortDirection) {
      return Promise.resolve().then(() => {
        if (this.isTimeBasedInterval()) {
          return intervals.toIndexList(
            this.id, this.getInterval(), start, stop, sortDirection
          );
        }

        if (this.isTimeBasedWildcard() && this.isIndexExpansionEnabled()) {
          return calculateIndices(
            this.id, this.timeFieldName, start, stop, sortDirection
          );
        }

        return [
          {
            index: this.id,
            min: -Infinity,
            max: Infinity
          }
        ];
      });
    }

    isIndexExpansionEnabled() {
      return !this.notExpandable;
    }

    isTimeBased() {
      return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
    }

    isTimeBasedInterval() {
      return this.isTimeBased() && !!this.getInterval();
    }

    isTimeBasedWildcard() {
      return this.isTimeBased() && this.isWildcard();
    }

    getTimeField() {
      if (!this.timeFieldName || !this.fields || !this.fields.byName) return;
      return this.fields.byName[this.timeFieldName];
    }

    isWildcard() {
      return _.includes(this.id, '*');
    }

    prepBody() {
      const body = {};

      // serialize json fields
      _.forOwn(mapping, (fieldMapping, fieldName) => {
        if (this[fieldName] != null) {
          body[fieldName] = (fieldMapping._serialize)
            ? fieldMapping._serialize(this[fieldName])
            : this[fieldName];
        }
      });

      // ensure that the docSource has the current this.id
      docSources.get(this).id(this.id);

      // clear the indexPattern list cache
      getIds.clearCache();
      return body;
    }

    create() {
      const body = this.prepBody();
      return docSources.get(this)
      .doCreate(body)
      .then(id => setId(this, id))
      .catch(err => {
        if (_.get(err, 'origError.status') !== 409) {
          // kibi: notify errors
          notify.error(err);
          return Promise.resolve(false);
        }
        const confirmMessage = 'Are you sure you want to overwrite this?';

        return confirmModalPromise(confirmMessage, { confirmButtonText: 'Overwrite' })
        .then(() => Promise
          .try(() => {
            const cached = patternCache.get(this.id);
            if (cached) {
              return cached.then(pattern => pattern.destroy());
            }
          })
          .then(() => docSources.get(this).doIndex(body))
          .then(id => setId(this, id)),
          _.constant(false) // if the user doesn't overwrite, resolve with false
        );
      });
    }

    save() {
      const body = this.prepBody();
      return docSources.get(this)
      .doIndex(body)
      .then(id => setId(this, id))
      .then(() => mappings.clearCache())
      // kibi: notify errors
      .catch((error) => {
        notify.error(error);
        throw error;
      });
      // kibi: end
    }

    refreshFields() {
      return Promise.resolve()
      .then(() => mapper.clearCache(this))
      .then(() => this._fetchFieldsPath()) // kibi: retrieve the path of each field
      .then(() => fetchFields(this))
      .then(() => this.save())
      .catch((err) => {
        notify.error(err);
        // https://github.com/elastic/kibana/issues/9224
        // This call will attempt to remap fields from the matching
        // ES index which may not actually exist. In that scenario,
        // we still want to notify the user that there is a problem
        // but we do not want to potentially make any pages unusable
        // so do not rethrow the error here
        if (err instanceof IndexPatternMissingIndices) {
          return [];
        }

        throw err;
      });
    }

    // kibi: return the field paths sequence in order to support field names with dots
    _fetchFieldsPath() {
      return mapper.getPathsSequenceForIndexPattern(this)
      .then(paths => {
        this.paths = paths;
        this.kibiPathsFetched = true;
      });
    }
    // kibi: end

    toJSON() {
      return this.id;
    }

    toString() {
      return '' + this.toJSON();
    }

    destroy() {
      unwatch(this);
      patternCache.clear(this.id);
      docSources.get(this).destroy();
      docSources.delete(this);
    }
  }

  return IndexPattern;
}
