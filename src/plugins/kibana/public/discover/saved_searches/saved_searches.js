import _ from 'lodash';
import Scanner from 'ui/utils/scanner';

define(function (require) {

  require('plugins/kibana/discover/saved_searches/_saved_search');
  require('ui/notify');

  const module = require('ui/modules').get('discover/saved_searches', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedSearches',
    title: 'searches'
  });

  // kibi: inject Saved Objects API
  module.service('savedSearches', function (Promise, config, kbnIndex, savedObjectsAPI, createNotifier, SavedSearch, kbnUrl, Private) {
    const cache = Private(require('ui/kibi/helpers/cache_helper')); // kibi: added to cache requests for saved searches
    const scanner = new Scanner(savedObjectsAPI, {
      index: kbnIndex,
      type: 'search'
    });

    const notify = createNotifier({
      location: 'Saved Searches'
    });

    this.type = SavedSearch.type;
    this.Class = SavedSearch;

    this.loaderProperties = {
      name: 'savedObjectsAPI',
      noun: 'Saved Search',
      nouns: 'saved searches'
    };

    this.scanAll = function (queryString, pageSize = 1000) {
      return scanner.scanAndMap(queryString, {
        pageSize,
        docCount: Infinity
      }, (hit) => this.mapHits(hit));
    };


    this.get = function (id) {
      let cacheKey;
      if (id) {
        cacheKey = 'savedSearches-id-' + id;
      }
      // kibi: get from cache
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      const promise = (new SavedSearch(id)).init();
      if (cacheKey && cache) {
        // kibi: put into cache
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/discover/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedSearch(id)).delete();
      });
    };

    this.mapHits = function (hit) {
      const source = hit._source;
      source.id = hit._id;
      source.url = this.urlFor(hit._id);
      return source;
    };

    this.find = function (searchString, size = 100) {
      if (!searchString) {
        searchString = null;
      }

      // kibi: get from cache
      const cacheKey = 'savedSearches' + (searchString ? searchString : '');
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      // kibi: search using the Saved Objects API
      return savedObjectsAPI.search({
        index: kbnIndex,
        type: this.type,
        q: searchString,
        size: 100
      })
      .then((resp) => {
        const result = {
          total: resp.hits.total,
          hits: resp.hits.hits.map((hit) => this.mapHits(hit))
        };

        if (cache) {
          cache.set(cacheKey, result);
        }

        return result;
      });
      // kibi: end

    };
  });
});
