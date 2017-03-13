define(function (require) {
  const module = require('ui/modules').get('app/dashboard');
  const _ = require('lodash');
  const Scanner = require('ui/utils/scanner');

  // bring in the factory
  require('plugins/kibana/dashboard/services/_saved_dashboard');


  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedDashboards',
    title: 'dashboards'
  });

  // kibi: added savedObjectsAPI dep
  module.service('savedDashboards', function (Promise, SavedDashboard, kbnIndex, es, savedObjectsAPI, kbnUrl, Private) {
    const cache = Private(require('ui/kibi/helpers/cache_helper')); // kibi: added to cache requests for saved searches
    const scanner = new Scanner(es, {
      index: kbnIndex,
      type: 'dashboard'
    });

    this.type = SavedDashboard.type;
    this.Class = SavedDashboard;


    this.loaderProperties = {
      name: 'dashboards',
      noun: 'Dashboard',
      nouns: 'dashboards'
    };

    // Returns a single dashboard by ID, should be the name of the dashboard
    this.get = function (id) {
      // Returns a promise that contains a dashboard which is a subclass of docSource
      return (new SavedDashboard(id)).init();
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

    // kibi: get dashboards from the Saved Object API.
    this.find = function (searchString, size = 100) {
      if (!searchString) {
        searchString = null;
      }

      const cacheKey = 'savedDashboards' + (searchString ? searchString : '');
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
