import _ from 'lodash';
import Scanner from 'ui/utils/scanner';

define(function (require) {
  require('plugins/kibana/settings/sections/kibi_templates/services/_saved_template');

  const module = require('ui/modules').get('templates_editor/services/saved_templates', []);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedTemplates',
    title: 'templates'
  });

  module.service('savedTemplates', function (Private, Promise, kbnIndex, savedObjectsAPI, createNotifier, SavedTemplate, kbnUrl) {
    const cache = Private(require('ui/kibi/helpers/cache_helper'));

    const notify = createNotifier({
      location: 'Saved Templates'
    });

    const scanner = new Scanner(savedObjectsAPI, {
      index: kbnIndex,
      type: 'template'
    });

    this.type = SavedTemplate.type;
    this.Class = SavedTemplate;

    this.loaderProperties = {
      name: 'templates',
      noun: 'Template',
      nouns: 'templates'
    };

    this.get = function (id) {
      let cacheKey;
      if (id) {
        cacheKey = 'savedTemplates-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      const promise = (new SavedTemplate(id)).init();
      if (cacheKey && cache) {
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/settings/templates/{{id}}', {id: id});
    };

    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedTemplate(id)).delete();
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
      const cacheKey = 'savedTemplates' + (searchString ? searchString : '');
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
