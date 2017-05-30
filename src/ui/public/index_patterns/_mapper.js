import { IndexPatternMissingIndices, IndexPatternAuthorizationError } from 'ui/errors';
import _ from 'lodash';
import moment from 'moment';
import EnhanceFieldsWithCapabilitiesProvider from 'ui/index_patterns/_enhance_fields_with_capabilities';
import IndexPatternsTransformMappingIntoFieldsProvider from 'ui/index_patterns/_transform_mapping_into_fields';
import IndexPatternsPatternToWildcardProvider from 'ui/index_patterns/_pattern_to_wildcard';
import IndexPatternsLocalCacheProvider from 'ui/index_patterns/_local_cache';

// kibi: imports
import PathsProvider from 'ui/kibi/index_patterns/_get_paths_for_index_pattern';

// kibi: require savedObjecsAPI service instead of esAdmin, added mappings
export default function MapperService(Private, Promise, es, savedObjectsAPI, config, kbnIndex, mappings) {
  const enhanceFieldsWithCapabilities = Private(EnhanceFieldsWithCapabilitiesProvider);
  const transformMappingIntoFields = Private(IndexPatternsTransformMappingIntoFieldsProvider);
  const patternToWildcard = Private(IndexPatternsPatternToWildcardProvider);
  const LocalCache = Private(IndexPatternsLocalCacheProvider);

  // kibi: support dots in field name
  const _getPathsForIndexPattern = Private(PathsProvider);


  function Mapper() {

    // Save a reference to mapper
    const self = this;

    // proper-ish cache, keeps a clean copy of the object, only returns copies of it's copy
    const fieldCache = self.cache = new LocalCache();

    /**
     * kibi: getPathsSequenceForIndexPattern returns an object which keys are paths, and values the path as an array
     * with each element being a field name.
     */
    self.getPathsSequenceForIndexPattern = function (indexPattern) {
      let promise = Promise.resolve(indexPattern.id);

      if (indexPattern.intervalName) {
        promise = self.getIndicesForIndexPattern(indexPattern)
        .then(function (existing) {
          if (existing.matches.length === 0) throw new IndexPatternMissingIndices();
          return existing.matches.slice(-config.get('indexPattern:fieldMapping:lookBack')); // Grab the most recent
        });
      }

      return promise.then(function (indexList) {
        // kibi: use our service to reduce the number of calls to the backend
        return mappings.getMapping(indexList);
      })
      .catch(handleMissingIndexPattern)
      .then(_getPathsForIndexPattern);
    };
    // kibi: end

    /**
     * Gets an object containing all fields with their mappings
     * @param {dataSource} dataSource
     * @param {object} options
     * @returns {Promise}
     * @async
     */
    self.getFieldsForIndexPattern = function (indexPattern, opts) {
      const id = indexPattern.id;

      const cache = fieldCache.get(id);
      if (cache) return Promise.resolve(cache);

      if (!opts.skipIndexPatternCache) {
        // kibi: retrieve index pattern using the saved objects API.
        return savedObjectsAPI.get({
          index: kbnIndex,
          type: 'index-pattern',
          id: id
        })
        // kibi: end
        .then(function (resp) {
          if (resp.found && resp._source.fields) {
            fieldCache.set(id, JSON.parse(resp._source.fields));
          }
          return self.getFieldsForIndexPattern(indexPattern, { skipIndexPatternCache: true });
        });
      }

      let indexList = id;
      let promise = Promise.resolve();
      if (indexPattern.intervalName) {
        promise = self.getIndicesForIndexPattern(indexPattern)
        .then(function (existing) {
          if (existing.matches.length === 0) throw new IndexPatternMissingIndices();
          indexList = existing.matches.slice(-config.get('indexPattern:fieldMapping:lookBack')); // Grab the most recent
        });
      }

      return promise.then(function () {
        return es.indices.getFieldMapping({
          index: indexList,
          fields: '*',
          ignoreUnavailable: _.isArray(indexList),
          allowNoIndices: false,
          includeDefaults: true
        });
      })
      .catch(handleMissingIndexPattern)
      .then(transformMappingIntoFields)
      .then(fields => enhanceFieldsWithCapabilities(fields, indexList))
      .then(function (fields) {
        fieldCache.set(id, fields);
        return fieldCache.get(id);
      });
    };

    self.getIndicesForIndexPattern = function (indexPattern) {
      return es.indices.getAlias({
        index: patternToWildcard(indexPattern.id)
      })
      .then(function (resp) {
        // let all = Object.keys(resp).sort();
        const all = _(resp)
        .map(function (index, key) {
          if (index.aliases) {
            return [Object.keys(index.aliases), key];
          } else {
            return key;
          }
        })
        .flattenDeep()
        .sort()
        .uniq(true)
        .value();

        const matches = all.filter(function (existingIndex) {
          const parsed = moment(existingIndex, indexPattern.id);
          return existingIndex === parsed.format(indexPattern.id);
        });

        return {
          all: all,
          matches: matches
        };
      })
      .catch(handleMissingIndexPattern);
    };

    /**
     * Clears mapping caches from elasticsearch and from local object
     * @param {dataSource} dataSource
     * @returns {Promise}
     * @async
     */
    self.clearCache = function (indexPattern) {
      fieldCache.clear(indexPattern);
      return Promise.resolve();
    };
  }

  function handleMissingIndexPattern(err) {
    // kibi: handle authorization errors
    if (err.status === 403) {
      return Promise.reject(new IndexPatternAuthorizationError());
    } else if (err.status >= 400) {
      // transform specific error type
      return Promise.reject(new IndexPatternMissingIndices(err.message));
    } else {
      // rethrow all others
      throw err;
    }
  }

  return new Mapper();
}
