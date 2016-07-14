define(function (require) {

  var _ = require('lodash');
  var Scanner = require('ui/utils/scanner');

  require('plugins/kibana/settings/sections/kibi_dashboard_groups/services/_saved_dashboard_group');

  var module = require('ui/modules').get('dashboard_groups_editor/services/saved_dashboard_groups');

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedDashboardGroups',
    title: 'dashboardgroups'
  });

  module.service('savedDashboardGroups', function (Promise, config, kbnIndex, es, createNotifier, SavedDashboardGroup, kbnUrl, Private) {

    var cache = Private(require('ui/kibi/helpers/cache_helper'));

    var notify = createNotifier({
      location: 'Saved Dashboard Groups'
    });

    var scanner = new Scanner(es, {
      index: kbnIndex,
      type: 'dashboardgroup'
    });

    this.type = SavedDashboardGroup.type;
    this.Class = SavedDashboardGroup;

    this.loaderProperties = {
      name: 'dashboardgroups',
      noun: 'Dashboard Group',
      nouns: 'dashboardgroup'
    };


    this.get = function (id) {
      var cacheKey;
      if (id) {
        cacheKey = 'savedDashboardgroups-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      // Returns a promise that contains a dashboard which is a subclass of docSource
      var promise = (new SavedDashboardGroup(id)).init();
      if (cacheKey && cache) {
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
      source.dashboards = JSON.parse(source.dashboards);
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

      var cacheKey = 'savedDashboardGroups' + (searchString ? searchString : '');
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: kbnIndex,
        type: 'dashboardgroup',
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
