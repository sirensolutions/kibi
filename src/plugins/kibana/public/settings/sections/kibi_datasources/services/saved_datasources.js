define(function (require) {

  var _ = require('lodash');
  var Scanner = require('ui/utils/scanner');

  require('plugins/kibana/settings/sections/kibi_datasources/services/_saved_datasource');

  var module = require('ui/modules').get('kibi_datasources/services/saved_datasources', []);


  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedDatasources',
    title: 'datasources'
  });

  module.service('savedDatasources', function (Promise, kbnIndex, es, kbnUrl, SavedDatasource, createNotifier, Private) {

    var cache = Private(require('ui/kibi/helpers/cache_helper'));

    var notify = createNotifier({
      location: 'Saved Datasources'
    });

    var scanner = new Scanner(es, {
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
      var cacheKey;
      if (id) {
        cacheKey = 'savedDatasources-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      // Returns a promise that contains a dashboard which is a subclass of docSource
      var promise = (new SavedDatasource(id)).init();
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
      var source = hit._source;
      source.id = hit._id;
      source.url = this.urlFor(hit._id);
      return source;
    };


    this.find = function (searchString) {
      var self = this;
      var body = searchString ? {
        query: {
          simple_query_string: {
            query: searchString + '*',
            fields: ['title^3', 'description'],
            default_operator: 'AND'
          }
        }
      } : { query: {match_all: {}}};

      var cacheKey = 'savedDatasources' + (searchString ? searchString : '');
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: kbnIndex,
        type: 'datasource',
        body: body,
        size: 100
      })
      .then((resp) => {
        var ret = {
          total: resp.hits.total,
          hits: resp.hits.hits.map((hit) => this.mapHits(hit))
        };
        if (cache) {
          cache.set(cacheKey, ret);
        }
        return ret;
      });
    };
  });
});
