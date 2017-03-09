import _ from 'lodash';
import Scanner from 'ui/utils/scanner';

define(function (require) {

  require('plugins/kibana/settings/sections/kibi_datasources/services/_saved_datasource');

  const module = require('ui/modules').get('kibi_datasources/services/saved_datasources', []);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedDatasources',
    title: 'datasources'
  });

  module.service('savedDatasources', function (Promise, kbnIndex, savedObjectsAPI, kbnUrl, SavedDatasource, createNotifier, Private) {

    const cache = Private(require('ui/kibi/helpers/cache_helper'));

    const notify = createNotifier({
      location: 'Saved Datasources'
    });

    const scanner = new Scanner(savedObjectsAPI, {
      index: kbnIndex,
      type: 'datasource'
    });

    this.type = SavedDatasource.type;
    this.Class = SavedDatasource;

    this.loaderProperties = {
      name: 'datasources',
      noun: 'Datasource',
      nouns: 'datasources'
    };

    this.get = function (id) {
      let cacheKey;
      if (id) {
        cacheKey = 'savedDatasources-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      // Returns a promise that contains a dashboard which is a subclass of docSource
      const promise = (new SavedDatasource(id)).init();
      if (cacheKey && cache) {
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/settings/datasources/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedDatasource(id)).delete();
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

      const cacheKey = 'savedDatasources' + (searchString ? searchString : '');
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
