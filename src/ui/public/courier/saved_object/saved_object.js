define(function (require) {
  // kibi: include savedObjectsAPI dependencies
  return function SavedObjectFactory(es, savedObjectsAPI, savedObjectsAPITypes, kbnIndex, Promise, Private, createNotifier, safeConfirm,
                                     indexPatterns) {
    let angular = require('angular');
    let errors = require('ui/errors');
    let _ = require('lodash');
    let kibiUtils = require('kibiutils');

    let DocSource = Private(require('ui/courier/data_source/doc_source'));
    let SearchSource = Private(require('ui/courier/data_source/search_source'));
    // kibi: use a custom source for objects managed by the Saved Objects API
    let SavedObjectSource = Private(require('ui/courier/data_source/savedobject_source'));
    // kibi: end
    let mappingSetup = Private(require('ui/utils/mapping_setup'));

    // kibi: added to clear the cache on object save
    var cache = Private(require('ui/kibi/helpers/cache_helper'));
    // kibi: end

    function SavedObject(config) {
      if (!_.isObject(config)) config = {};

      // save an easy reference to this
      let self = this;

      /************
       * Initialize config vars
       ************/
      // the doc which is used to store this object
      // kibi: set source based on type
      let docSource;
      if (savedObjectsAPITypes.has(config.type)) {
        docSource = new SavedObjectSource();
      } else {
        docSource = new DocSource();
      }
      // kibi: end

      // type name for this object, used as the ES-type
      let type = config.type;

      // Create a notifier for sending alerts
      let notify = createNotifier({
        location: 'Saved ' + type
      });

      // mapping definition for the fields that this object will expose
      let mapping = mappingSetup.expandShorthand(config.mapping);

      // default field values, assigned when the source is loaded
      let defaults = config.defaults || {};

      let afterESResp = config.afterESResp || _.noop;
      let customInit = config.init || _.noop;

      // optional search source which this object configures
      self.searchSource = config.searchSource && new SearchSource();

      // the id of the document
      self.id = config.id || void 0;
      self.defaults = config.defaults;

      /**
       * Asynchronously initialize this object - will only run
       * once even if called multiple times.
       *
       * @return {Promise}
       * @resolved {SavedObject}
       */
      self.init = _.once(function () {
        // ensure that the type is defined
        if (!type) throw new Error('You must define a type name to use SavedObject objects.');

        // tell the docSource where to find the doc
        docSource
        .index(kbnIndex)
        .type(type)
        .id(self.id);

        // check that the mapping for this type is defined
        return mappingSetup.isDefined(type)
        .then(function (defined) {
          // if it is already defined skip this step
          if (defined) return true;

          mapping.kibanaSavedObjectMeta = {
            properties: {
              // setup the searchSource mapping, even if it is not used but this type yet
              searchSourceJSON: {
                type: 'string'
              }
            }
          };

          // tell mappingSetup to set type
          return mappingSetup.setup(type, mapping);
        })
        .then(function () {
          // If there is not id, then there is no document to fetch from elasticsearch
          if (!self.id) {
            // just assign the defaults and be done
            _.assign(self, defaults);
            return hydrateIndexPattern().then(function () {
              return afterESResp.call(self);
            });
          }

          // fetch the object from ES
          return docSource.fetch()
          .then(self.applyESResp);
        })
        .then(function () {
          return customInit.call(self);
        })
        .then(function () {
          // return our obj as the result of init()
          return self;
        });
      });

      self.applyESResp = function (resp) {
        self._source = _.cloneDeep(resp._source);

        if (resp.found != null && !resp.found) throw new errors.SavedObjectNotFound(type, self.id);

        let meta = resp._source.kibanaSavedObjectMeta || {};
        delete resp._source.kibanaSavedObjectMeta;

        if (!config.indexPattern && self._source.indexPattern) {
          config.indexPattern = self._source.indexPattern;
          delete self._source.indexPattern;
        }

        // assign the defaults to the response
        _.defaults(self._source, defaults);

        // transform the source using _deserializers
        _.forOwn(mapping, function ittr(fieldMapping, fieldName) {
          if (fieldMapping._deserialize) {
            self._source[fieldName] = fieldMapping._deserialize(self._source[fieldName], resp, fieldName, fieldMapping);
          }
        });

        // Give obj all of the values in _source.fields
        _.assign(self, self._source);

        return Promise.try(function () {
          parseSearchSource(meta.searchSourceJSON);
        })
        .then(hydrateIndexPattern)
        .then(function () {
          return Promise.cast(afterESResp.call(self, resp));
        })
        .then(function () {
          // Any time obj is updated, re-call applyESResp
          docSource.onUpdate().then(self.applyESResp, notify.fatal);
        });
      };

      function parseSearchSource(searchSourceJson) {
        if (!self.searchSource) return;

        // if we have a searchSource, set its state based on the searchSourceJSON field
        let state;
        try {
          state = JSON.parse(searchSourceJson);
        } catch (e) {
          state = {};
        }

        let oldState = self.searchSource.toJSON();
        let fnProps = _.transform(oldState, function (dynamic, val, name) {
          if (_.isFunction(val)) dynamic[name] = val;
        }, {});

        self.searchSource.set(_.defaults(state, fnProps));
      }

      /**
       * After creation or fetching from ES, ensure that the searchSources index indexPattern
       * is an bonafide IndexPattern object.
       *
       * @return {[type]} [description]
       */
      function hydrateIndexPattern() {
        return Promise.try(function () {
          if (self.searchSource) {

            let index = config.indexPattern || self.searchSource.getOwn('index');
            if (!index) return;
            if (config.clearSavedIndexPattern) {
              self.searchSource.set('index', undefined);
              return;
            }

            if (!(index instanceof indexPatterns.IndexPattern)) {
              index = indexPatterns.get(index);
            }

            return Promise.resolve(index).then(function (indexPattern) {
              self.searchSource.set('index', indexPattern);
            });
          }
        });
      }

      /**
       * Serialize this object
       *
       * @return {Object}
       */
      self.serialize = function () {
        let body = {};

        _.forOwn(mapping, function (fieldMapping, fieldName) {
          if (self[fieldName] != null) {
            body[fieldName] = (fieldMapping._serialize)
              ? fieldMapping._serialize(self[fieldName])
              : self[fieldName];
          }
        });

        if (self.searchSource) {

          var searchSourceJSON = _.omit(self.searchSource.toJSON(), ['sort', 'size']);

          // kibi: - we have to filter out join_set filter as this filter
          // can only be turned on/off by relational panel and should not be saved
          if (searchSourceJSON.filter && searchSourceJSON.filter.length > 0) {
            searchSourceJSON.filter = _.filter(searchSourceJSON.filter, function (filter) {
              return !filter.join_set;
            });
          }
          if (searchSourceJSON.inject) {
            // do not serialize the inject queries
            delete searchSourceJSON.inject;
          }
          // kibi: end

          body.kibanaSavedObjectMeta = {
            searchSourceJSON: angular.toJson(searchSourceJSON)
          };
        }

        return body;
      };

      /**
       * Save this object
       *
       * @return {Promise}
       * @resolved {String} - The id of the doc
       */
      // kibi: add force flag
      // issue: https://github.com/sirensolutions/kibi-internal/issues/918
      self.save = function (force) {

        let body = self.serialize();

        // Slugify the object id
        self.id = kibiUtils.slugifyId(self.id);

        // ensure that the docSource has the current self.id
        docSource.id(self.id);

        // index the document
        return self.saveSource(body, force);
      };

      // kibi: add force flag
      // issue: https://github.com/sirensolutions/kibi-internal/issues/918
      self.saveSource = function (source, force) {
        let finish = function (id) {

          cache.flush(); // kibi: flush the cache after object was saved

          self.id = id;
          return es.indices.refresh({
            index: kbnIndex
          })
          // kibi: return the id regardless of the outcome of the refresh operation.
          .then(function () {
            return self.id;
          })
          .catch(function (err) {
            console.log(err);
            return self.id;
          });
        };

        if (force) { // kibi: if the force flag is true, silently updates the document
          return docSource.doIndex(source).then(finish);
        } else {
          return docSource.doCreate(source)
          .then(finish)
          .catch(function (err) {
            // record exists, confirm overwriting
            if (_.get(err, 'origError.status') === 409) {
              let confirmMessage = 'Are you sure you want to overwrite ' + self.title + '?';

              return safeConfirm(confirmMessage).then(
                function () {
                  return docSource.doIndex(source).then(finish);
                },
                _.noop // if the user doesn't overwrite record, just swallow the error
              );
            } else {
              notify.error(err); // kibi: added here so the errors are shown by notifier
            }
            return Promise.reject(err);
          });
        }
      };

      /**
       * Destroy this object
       *
       * @return {undefined}
       */
      self.destroy = function () {
        docSource.cancelQueued();
        if (self.searchSource) {
          self.searchSource.cancelQueued();
        }
      };

      /**
       * Delete this object from Elasticsearch
       * @return {promise}
       */
      self.delete = function () {
        // kibi: use the Saved Objects API client if needed
        let client = es;
        if (savedObjectsAPITypes.has(config.type)) {
          client = savedObjectsAPI;
        }
        return client.delete({
        // kibi: end
          index: kbnIndex,
          type: type,
          id: this.id
        }).then(function () {
          return es.indices.refresh({
            index: kbnIndex
          });
        });
      };
    }

    return SavedObject;
  };
});
