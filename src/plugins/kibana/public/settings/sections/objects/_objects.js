// kibi: import object actions registry
import objectActionsRegistry from 'ui/registry/object_actions';

define(function (require) {
  const _ = require('lodash');
  const angular = require('angular');
  const saveAs = require('@spalger/filesaver').saveAs;
  const registry = require('plugins/kibana/settings/saved_object_registry');
  const objectIndexHTML = require('plugins/kibana/settings/sections/objects/_objects.html');
  const MAX_SIZE = Math.pow(2, 31) - 1;

  require('ui/directives/file_upload');

  require('ui/routes')
  .when('/settings/objects', {
    template: objectIndexHTML
  });

  require('ui/modules').get('apps/settings')
  .directive('kbnSettingsObjects', function (
    kbnIndex, createNotifier, Private, kbnUrl, Promise,
    queryEngineClient, kibiVersion, savedObjectsAPI, config) { // kibi: replaces es with savedObjectsAPI

    // kibi: all below dependencies added by kibi to improve import/export and delete operations
    const cache = Private(require('ui/kibi/helpers/cache_helper'));
    const deleteHelper = Private(require('ui/kibi/helpers/delete_helper'));
    const refreshKibanaIndex = Private(require('plugins/kibana/settings/sections/indices/_refresh_kibana_index'));
    const getIds = Private(require('ui/index_patterns/_get_ids'));
    // kibi: end

    return {
      restrict: 'E',
      controller: function ($scope, $injector, $q, AppState, es, indexPatterns) {
        const notify = createNotifier({ location: 'Saved Objects' });

        const $state = $scope.state = new AppState();
        $scope.currentTab = null;
        $scope.selectedItems = [];

        // kibi: object actions registry
        $scope.objectActions = Private(objectActionsRegistry).toJSON();
        // kibi: end

        const getData = function (filter) {
          const services = registry.all().map(function (obj) {
            const service = $injector.get(obj.service);
            return service.find(filter).then(function (data) {
              return {
                service: service,
                serviceName: obj.service,
                title: obj.title,
                type: service.type,
                data: data.hits,
                total: data.total
              };
            });
          });

          $q.all(services).then(function (data) {
            $scope.services = _.sortBy(data, 'title');
            let tab = $scope.services[0];
            if ($state.tab) $scope.currentTab = tab = _.find($scope.services, {title: $state.tab});

            $scope.$watch('state.tab', function (tab) {
              if (!tab) $scope.changeTab($scope.services[0]);
            });
          });
        };


        $scope.toggleAll = function () {
          if ($scope.selectedItems.length === $scope.currentTab.data.length) {
            $scope.selectedItems.length = 0;
          } else {
            $scope.selectedItems = [].concat($scope.currentTab.data);
          }
        };

        $scope.toggleItem = function (item) {
          const i = $scope.selectedItems.indexOf(item);
          if (i >= 0) {
            $scope.selectedItems.splice(i, 1);
          } else {
            $scope.selectedItems.push(item);
          }
        };

        $scope.open = function (item) {
          kbnUrl.change(item.url.substr(1));
        };

        $scope.edit = function (service, item) {
          const params = {
            service: service.serviceName,
            id: item.id
          };

          kbnUrl.change('/settings/objects/{{ service }}/{{ id }}', params);
        };

        $scope.bulkDelete = function () {
          // kibi: modified to do some checks before the delete
          const _delete = function () {
            $scope.currentTab.service.delete(_.pluck($scope.selectedItems, 'id'))
            .then(cache.flush)
            .then(refreshData)
            .then(function () {
              $scope.selectedItems.length = 0;
            })
            .catch(notify.error); // kibi: added by kibi
          };

          deleteHelper.deleteByType($scope.currentTab.service.type, _.pluck($scope.selectedItems, 'id'), _delete);
          // kibi: end
        };

        $scope.bulkExport = function () {
          const objs = $scope.selectedItems.map(_.partialRight(_.extend, {type: $scope.currentTab.type}));
          retrieveAndExportDocs(objs);
        };

        $scope.exportAll = () => {
          Promise.map($scope.services, (service) =>
            service.service.scanAll('').then((results) =>
              results.hits.map((hit) => _.extend(hit, {type: service.type}))
            )
          ).then((results) => {
            // kibi: added by kibi
            results.push([{id: kibiVersion, type: 'config'}]); // kibi: here we also want to export "config" type
            return indexPatterns.getIds().then(function (list) {
              _.each(list, (id) => {
                results.push([{id: id, type: 'index-pattern'}]); // kibi: here we also want to export all index patterns
              });
              retrieveAndExportDocs(_.flattenDeep(results));
            });
            // kibi: end
          });
        };

        function retrieveAndExportDocs(objs) {
          if (!objs.length) return notify.error('No saved objects to export.');
          // kibi: use savedObjectsAPI instead of es
          savedObjectsAPI.mget({
            body: {docs: objs.map(transformToMget)}
          })
          .then(function (response) {
            saveToFile(response.docs.map(_.partialRight(_.pick, '_id', '_type', '_source')));
          });
        }

        // Takes an object and returns the associated data needed for an mget API request
        function transformToMget(obj) {
          // kibi: added index
          return {index: kbnIndex, _id: obj.id, _type: obj.type};
        }

        function saveToFile(results) {
          const blob = new Blob([angular.toJson(results, true)], {type: 'application/json'});
          saveAs(blob, 'export.json');
        }

        $scope.importAll = function (fileContents) {
          let docs;
          try {
            docs = JSON.parse(fileContents);
          } catch (e) {
            notify.error('The file could not be processed.');
          }

          // kibi: change the import to sequential to solve the dependency problem between objects
          // as visualisations could depend on searches
          // lets order the export to make sure that searches comes before visualisations
          // then also import object sequentially to avoid errors
          const configDocument = _.find(docs, function (o) {
            return o._type === 'config';
          });

          // kibi: added to manage index-patterns import
          const indexPatternDocuments = _.filter(docs, function (o) {
            return o._type === 'index-pattern';
          });

          docs = _.filter(docs, function (doc) {
            return doc._type !== 'config' && doc._type !== 'index-pattern';
          });

          // kibi: added to sort the docs by type
          docs.sort(function (a, b) {
            if (a._type === 'search' && b._type !== 'search') {
              return -1;
            } else if (a._type !== 'search' && b._type === 'search') {
              return 1;
            } else {
              if (a._type < b._type) {
                return -1;
              } else if (a._type > b._type) {
                return 1;
              } else {
                return 0;
              }
            }
          });

          // kibi: added to make sure that after an import queries are in sync
          function reloadQueries() {
            return queryEngineClient.clearCache();
          }

          // kibi: load index-patterns
          const createIndexPattern = function (doc) {
            return savedObjectsAPI.index({
              index: kbnIndex,
              type: 'index-pattern',
              id: doc._id,
              body: doc._source
            });
          };

          const loadIndexPatterns = function (indexPatternDocuments) {
            if (indexPatternDocuments && indexPatternDocuments.length > 0) {
              const promises = [];
              _.each(indexPatternDocuments, (doc) => {
                promises.push(createIndexPattern(doc));
              });
              return Promise.all(promises).then(() => {
                // very important !!! to clear the cached promise
                // which returns list of index patterns
                getIds.clearCache();
              });
            } else {
              return Promise.resolve(true);
            }
          };

          // kibi: override config properties
          const loadConfig = function (configDocument) {
            if (configDocument) {
              if (configDocument._id === kibiVersion) {
                // override existing config values
                const promises = [];
                _.each(configDocument._source, function (value, key) {
                  promises.push(config.set(key, value));
                });
                return Promise.all(promises);
              } else {
                notify.error(
                  'Config object version [' + configDocument._id + '] in the import ' +
                  'does not match current version [' + kibiVersion + ']\n' +
                  'Will NOT import any of the advanced settings parameters'
                );
              }
            } else {
              // return Promise so we can chain the other part
              return Promise.resolve(true);
            }
          };

          // kibi: now execute this sequentially
          const executeSequentially = function (docs) {
            const functionArray = [];
            _.each(docs, function (doc) {
              functionArray.push(function (previousOperationResult) {
                // previously this part was done in Promise.map
                const service = _.find($scope.services, {type: doc._type}).service;
                return service.get().then(function (obj) {
                  obj.id = doc._id;
                  return obj.applyESResp(doc).then(function () {
                    return obj.save();
                  });
                });
                // end
              });
            });

            return functionArray.reduce(
              function (prev, curr, i) {
                return prev.then(function (res) {
                  return curr(res);
                });
              },
              Promise.resolve(null)
            );
          };

          return loadIndexPatterns(indexPatternDocuments).then(function () {
            return loadConfig(configDocument).then(function () {
              return executeSequentially(docs);
            });
          })
          .then(refreshKibanaIndex)
          .then(reloadQueries) // kibi: to clear backend cache
          .then(refreshData, notify.error);
        };

        function refreshData() {
          return getData($scope.advancedFilter);
        }

        $scope.changeTab = function (tab) {
          $scope.currentTab = tab;
          $scope.selectedItems.length = 0;
          $state.tab = tab.title;
          $state.save();
        };

        $scope.$watch('advancedFilter', function (filter) {
          getData(filter);
        });
      }
    };
  });
});
