import _ from 'lodash';
import { Scanner } from 'ui/utils/scanner';
import { StringUtils } from 'ui/utils/string_utils';

export class SavedObjectLoader {
  constructor(SavedObjectClass, kbnIndex, esAdmin, kbnUrl, { savedObjectsAPI, caching: { cache, find, get } = {}, mapHit, exclude } = {}) {
    // kibi: kibi properties
    this.savedObjectsAPI = savedObjectsAPI;
    this.mapHit = mapHit;
    this.cache = cache;
    this.cacheGet = get;
    this.cacheFind = find;
    this.exclude = exclude;
    this.reservedCharactersRegex = new RegExp('[+\\-=&|><!(){}[\\\]^"~*?:]', 'g');
    // kibi: end

    this.type = SavedObjectClass.type;
    this.Class = SavedObjectClass;
    this.lowercaseType = this.type.toLowerCase();
    this.kbnIndex = kbnIndex;
    this.kbnUrl = kbnUrl;

    let scannerClient = esAdmin;
    if (this.savedObjectsAPI) {
      scannerClient = savedObjectsAPI;
    }
    this.scanner = new Scanner(scannerClient, {
      index: kbnIndex,
      type: this.lowercaseType
    });

    this.loaderProperties = {
      name: `${ this.lowercaseType }s`,
      noun: StringUtils.upperFirst(this.type),
      nouns: `${ this.lowercaseType }s`,
    };
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

  /**
   * Updates hit._source to contain an id and url field, and returns the updated
   * source object.
   * @param hit
   * @returns {hit._source} The modified hit._source object, with an id and url field.
   */
  mapHits(hit) {
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
    return this.scanner.scanAndMap(queryString, {
      pageSize,
      docCount: Infinity
    }, (hit) => this.mapHits(hit));
  }

  /**
   * kibi: get dashboards from the Saved Object API.
   * TODO: Rather than use a hardcoded limit, implement pagination. See
   * https://github.com/elastic/kibana/issues/8044 for reference.
   *
   * @param searchString
   * @param size - The number of documents to return
   * @param exclude - A list of fields to exclude
   * @returns {Promise}
   */
  find(searchString, size = 100) {
    if (!searchString) {
      searchString = null;
    }

    // kibi: cache results
    const cacheKey = `${this.lowercaseType}-${searchString || ''}`;
    if (this.cacheFind && this.cache && this.cache.get(cacheKey)) {
      return Promise.resolve(this.cache.get(cacheKey));
    }

    //kibi: if searchString contains reserved characters, split it with reserved characters
    // combine words with OR operator
    let safeQuery = '';
    if (searchString && searchString.match(this.reservedCharactersRegex)) {
      const words = searchString.split(this.reservedCharactersRegex).map((item) => item.trim());
      _.each(words, function (word) {
        safeQuery = safeQuery + '||' + word;
      });
    };

    return this.savedObjectsAPI.search({
      index: this.kbnIndex,
      type: this.lowercaseType,
      q: safeQuery || searchString,
      exclude: this.exclude,
      size
    })
    .then((resp) => {
      const result = {
        total: resp.hits.total,
        hits: resp.hits.hits.map((hit) => this.mapHits(hit))
      };
      if (this.cache && this.cacheFind) {
        this.cache.set(cacheKey, result);
      }

      //kibi: when escaping reserved characters in query, we do not filter with reserved chracters
      //if searchString contains reserved characters check titles of hits
      if (safeQuery) {
        result.hits = _.filter(result.hits, function (hit) { return hit.title.includes(searchString); });
        result.total = result.hits.length;
      }
      //kibi: end
      return result;
    });
  }
}
