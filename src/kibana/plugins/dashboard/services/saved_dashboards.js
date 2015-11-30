define(function (require) {
  var module = require('modules').get('app/dashboard');
  var _ = require('lodash');
  // bring in the factory
  require('plugins/dashboard/services/_saved_dashboard');


  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedDashboards',
    title: 'dashboards'
  });

  // This is the only thing that gets injected into controllers
  module.service('savedDashboards', function (Promise, SavedDashboard, config, es, kbnUrl, Private) {

    var cache = Private(require('components/sindicetech/cache_helper/cache_helper'));
    var self = this;
    this.type = SavedDashboard.type;
    this.Class = SavedDashboard;

    // Returns a single dashboard by ID, should be the name of the dashboard
    this.get = function (id) {
      var cacheKey = 'savedDashboards-id-' + id;
      if (cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      var promise = (new SavedDashboard(id)).init();
      if (cache) {
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/dashboard/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedDashboard(id)).delete();
      });
    };


    this.find = function (searchString, size) {
      var self = this;
      size = (size == null) ? 100 : size;
      var body;
      if (searchString) {
        body = {
          query: {
            simple_query_string: {
              query: searchString + '*',
              fields: ['title^3', 'description'],
              default_operator: 'AND'
            }
          }
        };
      } else {
        body = { query: {match_all: {}}};
      }

      // cache the results of this method
      var cacheKey = 'savedDashboards' + ( searchString ? searchString : '' );
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: config.file.kibana_index,
        type: 'dashboard',
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
