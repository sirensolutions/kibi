define(function (require) {
  var _ = require('lodash');

  require('plugins/sindicetech/templates_editor/services/saved_templates/_saved_template');
  require('components/notify/notify');

  var module = require('modules').get('templates_editor/services/saved_templates', [
    'kibana/notify'
  ]);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/settings/saved_object_registry').register({
    service: 'savedTemplates',
    title: 'templates'
  });

  module.service('savedTemplates', function (Private, Promise, config, configFile, es, createNotifier, SavedTemplate, kbnUrl) {

    var cache = Private(require('components/sindicetech/cache_helper/cache_helper'));
    var notify = createNotifier({
      location: 'Saved Templates'
    });

    this.type = SavedTemplate.type;

    this.get = function (id) {
      var cacheKey = 'savedTemplates-id-' + id;
      if (cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      var promise = (new SavedTemplate(id)).init();
      if (cache) {
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
      var cacheKey = 'savedTemplates' + ( searchString ? searchString : '' );
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: configFile.kibana_index,
        type: 'template',
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
