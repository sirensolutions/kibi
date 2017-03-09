import _ from 'lodash';
import Scanner from 'ui/utils/scanner';

define(function (require) {
  require('plugins/kibana/settings/sections/kibi_queries/services/_saved_query');

  const module = require('ui/modules').get('queries_editor/services/saved_queries', []);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedQueries',
    title: 'queries'
  });

  module.service('savedQueries', function (Private, Promise, kbnIndex, savedObjectsAPI, createNotifier, SavedQuery, kbnUrl) {
    const cache = Private(require('ui/kibi/helpers/cache_helper'));

    const notify = createNotifier({
      location: 'Saved Queries'
    });

    const scanner = new Scanner(savedObjectsAPI, {
      index: kbnIndex,
      type: 'query'
    });

    this.type = SavedQuery.type;
    this.Class = SavedQuery;

    this.loaderProperties = {
      name: 'queries',
      noun: 'Query',
      nouns: 'queries'
    };

    this.get = function (id) {
      let cacheKey;
      if (id) {
        cacheKey = 'savedQueries-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      const promise = (new SavedQuery(id)).init();
      if (cacheKey && cache) {
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/settings/queries/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedQuery(id)).delete();
      });
    };

    this.scanAll = function (queryString, pageSize = 1000) {
      return scanner.scanAndMap(queryString, {
        pageSize,
        docCount: Infinity
      }, (hit) => this.mapHits(hit));
    };

    this.mapHits = function (hit) {
      const source = hit._source;
      source.id = hit._id;
      source.url = this.urlFor(hit._id);
      return source;
    };

    this.find = function (searchString) {
      if (!searchString) {
        searchString = null;
      }

      // cache the results of this method
      const cacheKey = 'savedQueries' + (searchString ? searchString : '');
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

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
    };
  });
});
