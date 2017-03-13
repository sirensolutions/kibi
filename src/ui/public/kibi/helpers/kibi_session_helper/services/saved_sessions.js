define(function (require) {

  require('ui/kibi/helpers/kibi_session_helper/services/_saved_session');

  var module = require('ui/modules').get('ui/kibi/helpers/kibi_session_helper/services/saved_sessions', []);
  var _ = require('lodash');
  var Scanner = require('ui/utils/scanner');

  require('plugins/kibana/settings/saved_object_registry').register({
    service: 'savedSessions',
    title: 'sessions'
  });

  module.service('savedSessions', function ($rootScope, Promise, SavedSession, kbnIndex, es, kbnUrl, Private) {

    var cache = Private(require('ui/kibi/helpers/cache_helper')); // kibi: added to cache requests for saved sessions

    var scanner = new Scanner(es, {
      index: kbnIndex,
      type: 'session'
    });

    this.type = SavedSession.type;
    this.Class = SavedSession;


    this.loaderProperties = {
      name: 'sessions',
      noun: 'Session',
      nouns: 'sessions'
    };

    this.get = function (id) {
      var cacheKey;
      if (id) {
        cacheKey = 'savedSessions-id-' + id;
      }
      if (cacheKey && cache && cache.get(cacheKey)) {
        return cache.get(cacheKey);
      }
      var promise = (new SavedSession(id)).init();
      if (cacheKey && cache) {
        cache.set(cacheKey, promise);
      }
      return promise;
    };

    this.urlFor = function (id) {
      return kbnUrl.eval('#/session/{{id}}', {id: id});
    };

    // gets triggered when you select the checkbox in objects and press delete
    this.delete = function (ids) {
      ids = !_.isArray(ids) ? [ids] : ids;
      return Promise.map(ids, function (id) {
        return (new SavedSession(id)).delete().then(function (resp) {
          $rootScope.$emit('kibi:session:changed:deleted', id);
        });
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

    this.find = function (searchString, size = 100) {
      var body;
      if (searchString) {
        body = {
          query: {
            simple_query_string: {
              query: searchString + '*',
              fields: ['title^3'],
              default_operator: 'AND'
            }
          }
        };
      } else {
        body = { query: {match_all: {}}};
      }

      // kibi: get from cahce
      var cacheKey = 'savedSessions' + (searchString ? searchString : '');
      if (cache && cache.get(cacheKey)) {
        return Promise.resolve(cache.get(cacheKey));
      }

      return es.search({
        index: kbnIndex,
        type: 'session',
        body: body,
        size: size
      })
      .then((resp) => {
        var ret = {
          total: resp.hits.total,
          hits: resp.hits.hits.map((hit) => this.mapHits(hit))
        };

        // kibi: put into cache
        if (cache) {
          cache.set(cacheKey, ret);
        }
        return ret;
      });
    };
  });
});
