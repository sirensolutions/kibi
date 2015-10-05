define(function (require) {
  var _ = require('lodash');

  require('plugins/kibi/datasources_editor/services/saved_datasources/_saved_datasource');
  require('components/notify/notify');

  var module = require('modules').get('datasources_editor/services/saved_datasources', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedDatasources',
    title: 'datasources'
  });

  module.service('savedDatasources', function (Promise, configFile, es, kbnUrl, SavedDatasource, createNotifier, Private) {

    var cache = Private(require('components/sindicetech/cache_helper/cache_helper'));

    var notify = createNotifier({
      location: 'Saved Datasources'
    });

    this.type = SavedDatasource.type;

    this.get = function (id) {
      var cacheKey = 'savedDatasources-id-' + id;
      if (cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      // Returns a promise that contains a dashboard which is a subclass of docSource
      var promise = (new SavedDatasource(id)).init();
      if (cache) {
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

      var cacheKey = 'savedDatasources' + ( searchString ? searchString : '' );
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: configFile.kibana_index,
        type: 'datasource',
        body: body,
        size: 100
      })
      .then(function (resp) {
        var ret = {
          total: resp.hits.total,
          hits: resp.hits.hits.map(function (hit) {
            var source = hit._source;
            source.id = hit._id;
            source.url = self.urlFor(hit._id);
            return source;
          })
        };
        if (cache) {
          cache.set(cacheKey, ret);
        }
        return ret;
      });
    };
  });
});
