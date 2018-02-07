import _ from 'lodash';
import chrome from 'ui/chrome';
import { Scanner } from 'ui/utils/scanner';
import { StringUtils } from 'ui/utils/string_utils';
import { SavedObjectsClient } from 'ui/saved_objects';

// kibi: imports
import { jdbcDatasourceTranslate } from 'plugins/investigate_core/management/sections/kibi_datasources/services/jdbc_datasource_translate';
import angular from 'angular';
// kibi: end

export class SavedObjectLoader {
  constructor(
    SavedObjectClass, kbnIndex, esAdmin, kbnUrl,
    { savedObjectsAPI, $http, caching: { cache, find, get } = {}, mapHit, exclude, jdbcDatasources } = {},
  ) {
    // kibi: kibi properties
    this.savedObjectsAPI = savedObjectsAPI;
    this.mapHit = mapHit;
    this.cache = cache;
    this.cacheGet = get;
    this.cacheFind = find;
    this.exclude = exclude;
    this.reservedCharactersRegex = new RegExp('[+\\-=&|><!(){}[\\\]^"~*?:]', 'g');
    this.jdbcDatasources = jdbcDatasources;
    // kibi: end

    this.type = SavedObjectClass.type;
    this.Class = SavedObjectClass;
    this.lowercaseType = this.type.toLowerCase();
    this.kbnIndex = kbnIndex;
    this.kbnUrl = kbnUrl;

    this.scanner = new Scanner(esAdmin, {
      index: kbnIndex,
      type: this.lowercaseType
    });

    this.loaderProperties = {
      name: `${ this.lowercaseType }s`,
      noun: StringUtils.upperFirst(this.type),
      nouns: `${ this.lowercaseType }s`,
    };

    this.savedObjectsClient = new SavedObjectsClient($http, chrome.getBasePath(), Promise, this.savedObjectsAPI, kbnIndex);
  }

  /**
   * Retrieve a saved object by id. Returns a promise that completes when the object finishes
   * initializing.
   * @param id
   * @returns {Promise<SavedObject>}
   */
  get(id) {
    let cacheKey;
    if (id) {
      cacheKey = `${this.lowercaseType}-id-${id}`;
    }
    // kibi: get from cache
    if (this.cacheGe && this.cacheKey && this.cache && this.cache.get(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    const promise = (new this.Class(id)).init();
    if (this.cacheGet && cacheKey && this.cache) {
      // kibi: put into cache
      this.cache.set(cacheKey, promise);
    }
    return promise;
  }

  urlFor(id) {
    return this.kbnUrl.eval(`#/${ this.lowercaseType }/{{id}}`, { id: id });
  }

  delete(ids) {
    ids = !_.isArray(ids) ? [ids] : ids;

    const deletions = ids.map(id => {
      const savedObject = new this.Class(id);
      return savedObject.delete();
    });

    return Promise.all(deletions);
  }

  // kibi: alias to mapHitSource so we do not have to update all plugins
  // We would have to rename the method in our plugins
  // as mapHitSource is public and could be used from outside
  mapHits(hit) {
    return this.mapHitSource(hit);
  }
  // kibi: end

  /**
   * Updates source to contain an id and url field, and returns the updated
   * source object.
   * @param source
   * @param id
   * @returns {source} The modified source object, with an id and url field.
   */
  mapHitSource(hit) {
    // kibi: changed this method to take hit instead of source and id
    const source = hit._source;
    source.id = hit._id;
    source.url = this.urlFor(hit._id);
    // kibi: alter the contents of a source
    if (this.mapHit) {
      this.mapHit(source);
    }
    return source;
  }

  scanAll(queryString, pageSize = 1000) {
    // kibi: use savedObjectsClient
    return this.savedObjectsClient.find({
      type: this.lowercaseType,
      perPage: pageSize
    })
    .then(resp => Object.assign(resp, resp.hits));
    // kibi: end
  }

  /**
   * Updates hit.attributes to contain an id and url field, and returns the updated
   * attributes object.
   * @param hit
   * @returns {hit.attributes} The modified hit.attributes object, with an id and url field.
   */
  mapSavedObjectApiHits(hit) {
    return this.mapHitSource(hit);
  }

  /**
   * kibi: get dashboards from the Saved Object API.
   * TODO: Rather than use a hardcoded limit, implement pagination. See
   * https://github.com/elastic/kibana/issues/8044 for reference.
   *
   * @param searchString
   * @param removeReservedChars - //kibi: flag for removing reserved characters
   * @param size - The number of documents to return
   * @param exclude - A list of fields to exclude
   * @returns {Promise}
   */

  find(searchString, removeReservedChars = true, size = 100) {
    if (!searchString) {
      searchString = null;
    }

    // kibi: cache results
    const cacheKey = `${this.lowercaseType}-${searchString || ''}`;
    if (this.cacheFind && this.type !== 'datasource' && this.cache && this.cache.get(cacheKey)) {
      return Promise.resolve(this.cache.get(cacheKey));
    }

    //kibi: if searchString contains reserved characters, split it with reserved characters
    // combine words with OR operator
    let safeQuery = '';
    if (removeReservedChars && searchString && searchString.match(this.reservedCharactersRegex)) {
      const words = searchString.split(this.reservedCharactersRegex).map((item) => item.trim());
      _.each(words, function (word, index) {
        if (index === 0) {
          safeQuery = word;
        } else {
          safeQuery += ' || ' + word;
        }
      });
    };

    return this.savedObjectsClient.find({
      type: this.lowercaseType,
      search: safeQuery || searchString,
      perPage: size,
      exclude: this.exclude
    })
    .then((resp) => {
      const result = {
        total: resp.hits.total,
        hits: resp.hits.hits.map((hit) => this.mapHits(hit))
      };

      if (this.type === 'datasource') {
        return this.jdbcDatasources.list().then(datasources => {
          _.each(datasources, datasource => {
            result.hits.push(jdbcDatasourceTranslate.jdbcDatasourceToSavedDatasource(datasource));
          });
          return result;
        }).catch(err => {
          if (err.status === 403) {
            if (err.data && err.data.error && err.data.error.type === 'security_exception') {
              // ignore access error
              // user will simply not see the JDBC datasources if s/he has no access
              return result;
            } else if (err.data && err.data.error) {
              throw new Error('Access to JDBC datasources forbidden.' + JSON.stringify(err.data.error));
            } else {
              throw new Error('Access to JDBC datasources forbidden.' + JSON.stringify(err));
            }
          } else {
            throw err;
          }
        });
      }

      if (this.cache && this.cacheFind) {
        this.cache.set(cacheKey, result);
      }

      //kibi: when escaping reserved characters in query, we do not filter with reserved chracters
      //if searchString contains reserved characters check titles of hits
      if (safeQuery) {
        result.hits = _.filter(result.hits, function (hit) {
          return angular.lowercase(hit.title).includes(angular.lowercase(searchString));
        });
        result.total = result.hits.length;
      }
      //kibi: end
      return result;
    });
  }
}
