define(function (require) {
  var _ = require('lodash');

  require('plugins/sindicetech/queries_editor/services/saved_queries/_saved_query');
  require('components/notify/notify');

  var module = require('modules').get('queries_editor/services/saved_queries', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedQueries',
    title: 'queries'
  });

  module.service('savedQueries', function (Private, Promise, config, configFile, es, createNotifier, SavedQuery, kbnUrl) {

    var cache = Private(require('components/sindicetech/cache_helper/cache_helper'));
    var notify = createNotifier({
      location: 'Saved Queries'
    });

    this.type = SavedQuery.type;

    this.get = function (id) {
      var cacheKey = 'savedQueries-id-' + id;
      if (cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      var promise = (new SavedQuery(id)).init();
      if (cache) {
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

      // cache the results of this method
      var cacheKey = 'savedQueries' + ( searchString ? searchString : '' );
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: configFile.kibana_index,
        type: 'query',
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
