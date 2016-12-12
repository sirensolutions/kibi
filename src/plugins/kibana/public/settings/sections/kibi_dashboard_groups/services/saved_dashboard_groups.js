define(function (require) {

  const _ = require('lodash');
  const Scanner = require('ui/utils/scanner');

  require('plugins/kibana/settings/sections/kibi_dashboard_groups/services/_saved_dashboard_group');

  const module = require('ui/modules').get('dashboard_groups_editor/services/saved_dashboard_groups');

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedDashboardGroups',
    title: 'dashboardgroups'
  });

  module.service('savedDashboardGroups', function (Promise, config, kbnIndex, es, savedObjectsAPI, createNotifier, SavedDashboardGroup,
                                                   kbnUrl, Private) {

    const cache = Private(require('ui/kibi/helpers/cache_helper'));

    const notify = createNotifier({
      location: 'Saved Dashboard Groups'
    });

    const scanner = new Scanner(es, {
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
      let cacheKey;
      if (id) {
        cacheKey = 'savedDashboardgroups-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      // Returns a promise that contains a dashboard which is a subclass of docSource
      const promise = (new SavedDashboardGroup(id)).init();
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
      const source = hit._source;
      source.id = hit._id;
      source.url = this.urlFor(hit._id);
      source.dashboards = JSON.parse(source.dashboards);
      return source;
    };

    // kibi: get dashboardgroups from the Saved Object API.
    this.find = function (searchString, size = 100) {
      if (!searchString) {
        searchString = null;
      }

      const cacheKey = 'savedDashboardGroups' + (searchString ? searchString : '');
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return savedObjectsAPI.search({
        index: kbnIndex,
        type: this.type,
        q: searchString,
        size: size
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
    // kibi: end

  });
});
