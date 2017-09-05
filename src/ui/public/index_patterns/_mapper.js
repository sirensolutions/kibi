import { IndexPatternMissingIndices, IndexPatternAuthorizationError } from 'ui/errors';
import _ from 'lodash';
import moment from 'moment';
import { EnhanceFieldsWithCapabilitiesProvider } from 'ui/index_patterns/_enhance_fields_with_capabilities';
import { TransformMappingIntoFields } from 'ui/kibi/components/commons/_transform_mapping_into_fields';
import { PatternToWildcardFn } from 'ui/kibi/components/commons/_pattern_to_wildcard';
import { LocalCacheFactory } from 'ui/kibi/components/commons/_local_cache';

// kibi: imports
import { getPathsForIndexPattern } from 'ui/kibi/index_patterns/_get_paths_for_index_pattern';

// kibi: require savedObjecsAPI service instead of esAdmin, added mappings
export function IndexPatternsMapperProvider(Private, Promise, es, savedObjectsAPI, config, kbnIndex, mappings) {
  const enhanceFieldsWithCapabilities = Private(EnhanceFieldsWithCapabilitiesProvider);
  const transformMappingIntoFields = Private(TransformMappingIntoFields);
  const patternToWildcard = Private(PatternToWildcardFn);
  const LocalCache = Private(LocalCacheFactory);

  // kibi: support dots in field name
  const _getPathsForIndexPattern = Private(getPathsForIndexPattern);


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
      .catch(err => handleMissingIndexPattern(err, indexPattern))
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
          // kibi: do not throw IndexPatternMissingIndices error when existing.matches.length === 0
          if (existing.matches.length !== 0) {
            indexList = existing.matches.slice(-config.get('indexPattern:fieldMapping:lookBack')); // Grab the most recent
          }
        });
      }

      return promise.then(function () {
        return es.indices.getFieldMapping({
          index: indexList,
          fields: '*',
          ignoreUnavailable: _.isArray(indexList),
          allowNoIndices: false,
          includeDefaults: true
        })
        // kibi: wrap the response to be able to distinguish between valid one and error later
        .then((resp) => {
          return {
            response: resp
          };
        });
        // kibi: end
      })
      .catch((err) => {
        // kibi: empty response no index === no mappings
        // we do not want to see red errors about it
        if (err.displayName === 'NotFound' && err.statusCode === 404) {
          return {
            error: err
          };
        } else {
          return handleMissingIndexPattern(err, indexPattern);
        }
      })
      .then((response) => {
        // kibi: now if there was an error return empty list of fields
        if (response.error) {
          return [];
        }
        // if not execute the following kibana code
        return Promise.resolve(transformMappingIntoFields(response.response))
        .then(fields => enhanceFieldsWithCapabilities(fields, indexList))
        .then(function (fields) {
          fieldCache.set(id, fields);
          return fieldCache.get(id);
        });
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
      .catch(err => handleMissingIndexPattern(err, indexPattern));
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

  function handleMissingIndexPattern(err, indexPattern) {
    // kibi: handle authorization errors
    if (err.status === 403) {
      return Promise.reject(new IndexPatternAuthorizationError(indexPattern));
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
