define(function (require) {
  var _ = require('lodash');
  var Scanner = require('ui/utils/scanner');

  require('plugins/kibana/settings/sections/kibi_queries/services/_saved_query');

  var module = require('ui/modules').get('queries_editor/services/saved_queries', []);

  // Register this service with the saved object registry so it can be
  // edited by the object editor.
  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedQueries',
    title: 'queries'
  });

  module.service('savedQueries', function (Private, Promise, kbnIndex, es, createNotifier, SavedQuery, kbnUrl) {

    var cache = Private(require('ui/kibi/helpers/cache_helper'));
    var notify = createNotifier({
      location: 'Saved Queries'
    });

    var scanner = new Scanner(es, {
      index: kbnIndex,
      type: 'query'
    });

    this.type = SavedQuery.type;
    this.Class = SavedQuery;

    this.loaderProperties = {
      name: 'queries',
      noun: 'Query',
      nouns: 'queries'
    };

    this.get = function (id) {
      var cacheKey;
      if (id) {
        cacheKey = 'savedQueries-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      var promise = (new SavedQuery(id)).init();
      if (cacheKey && cache) {
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

      // cache the results of this method
      var cacheKey = 'savedQueries' + (searchString ? searchString : '');
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: kbnIndex,
        type: 'query',
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
