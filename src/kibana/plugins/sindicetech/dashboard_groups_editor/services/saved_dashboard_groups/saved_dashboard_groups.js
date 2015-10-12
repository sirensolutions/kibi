define(function (require) {
  var _ = require('lodash');

  require('plugins/sindicetech/dashboard_groups_editor/services/saved_dashboard_groups/_saved_dashboard_group');
  require('components/notify/notify');

  var module = require('modules').get('dashboard_groups_editor/services/saved_dashboard_groups', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedDashboardGroups',
    title: 'dashboardgroups'
  });

  module.service('savedDashboardGroups', function (Promise, config, configFile, es, createNotifier, SavedDashboardGroup, kbnUrl, Private) {

    var cache = Private(require('components/sindicetech/cache_helper/cache_helper'));

    var notify = createNotifier({
      location: 'Saved Dashboard Groups'
    });

    this.type = SavedDashboardGroup.type;

    this.get = function (id) {
      var cacheKey = 'savedDashboardgroups-id-' + id;
      if (cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      // Returns a promise that contains a dashboard which is a subclass of docSource
      var promise = (new SavedDashboardGroup(id)).init();
      if (cache) {
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/settings/dashboardgroups/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedDashboardGroup(id)).delete();
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

      var cacheKey = 'savedDashboardGroups' + ( searchString ? searchString : '' );
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: configFile.kibana_index,
        type: 'dashboardgroup',
        body: body,
        size: 100
      })
      .then(function (resp) {
        var ret = {
          total: resp.hits.total,
          hits: resp.hits.hits.map(function (hit) {
            var source = hit._source;
            source.dashboards = JSON.parse(source.dashboards);
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
