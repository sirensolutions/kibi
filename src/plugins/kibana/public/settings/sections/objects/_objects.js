define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var saveAs = require('@spalger/filesaver').saveAs;
  var registry = require('plugins/kibana/settings/saved_object_registry');
  var objectIndexHTML = require('plugins/kibana/settings/sections/objects/_objects.html');
  const MAX_SIZE = Math.pow(2, 31) - 1;

  require('ui/directives/file_upload');

  require('ui/routes')
  .when('/settings/objects', {
    template: objectIndexHTML
  });

  require('ui/modules').get('apps/settings')
  .directive('kbnSettingsObjects', function (
    kbnIndex, createNotifier, Private, kbnUrl, Promise,
    queryEngineClient, kbnVersion, es, config) {

    var cache = Private(require('ui/kibi/helpers/cache_helper')); // kibi: added by kibi
    var deleteHelper = Private(require('ui/kibi/helpers/delete_helper')); // kibi: added by kibi
    var kibiSessionHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_session_helper'));

    return {
      restrict: 'E',
      controller: function ($scope, $injector, $q, AppState, es) {
        var notify = createNotifier({ location: 'Saved Objects' });

        var $state = $scope.state = new AppState();
        $scope.currentTab = null;
        $scope.selectedItems = [];

        var getData = function (filter) {
          var services = registry.all().map(function (obj) {
            var service = $injector.get(obj.service);
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
            var tab = $scope.services[0];
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
          var i = $scope.selectedItems.indexOf(item);
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
          var params = {
            service: service.serviceName,
            id: item.id
          };

          kbnUrl.change('/settings/objects/{{ service }}/{{ id }}', params);
        };

        // kibi: added by kibi to be able to quickly show the current session
        $scope.showOnlyCurrentSession = true; // by default show only the user session
        $scope.filterItems = function (items) {
          // filter out other sessions only if the checkbox checked
          // and the current session initialized
          if ($scope.state && $scope.state.tab === 'sessions' &&
              $scope.showOnlyCurrentSession && kibiSessionHelper.initialized && kibiSessionHelper.id
          ) {
            return _.filter(items, function (session) {
              return session.id === kibiSessionHelper.id;
            });
          }
          return items;
        };
        // kibi: end


        $scope.bulkDelete = function () {
          // kibi: modified to do some checks before the delete
          var _delete = function () {
            $scope.currentTab.service.delete(_.pluck($scope.selectedItems, 'id'))
            .then(cache.flush)
            .then(refreshData)
            .then(function () {
              $scope.selectedItems.length = 0;
            });
          };

          deleteHelper.deleteByType($scope.currentTab.service.type, _.pluck($scope.selectedItems, 'id'), _delete);
          // kibi: end
        };

        $scope.bulkExport = function () {
          var objs = $scope.selectedItems.map(_.partialRight(_.extend, {type: $scope.currentTab.type}));
          retrieveAndExportDocs(objs);
        };

        $scope.exportAll = () => {
          Promise.map($scope.services, (service) =>
            service.service.scanAll('').then((results) =>
              results.hits.map((hit) => _.extend(hit, {type: service.type}))
            )
          ).then((results) => {
            results.push([{id: kbnVersion, type: 'config'}]); // kibi: here we also want to export "config" type
            retrieveAndExportDocs(_.flattenDeep(results));
          });
        };

        function retrieveAndExportDocs(objs) {
          if (!objs.length) return notify.error('No saved objects to export.');
          es.mget({
            index: kbnIndex,
            body: {docs: objs.map(transformToMget)}
          })
          .then(function (response) {
            saveToFile(response.docs.map(_.partialRight(_.pick, '_id', '_type', '_source')));
          });
        }

        // Takes an object and returns the associated data needed for an mget API request
        function transformToMget(obj) {
          return {_id: obj.id, _type: obj.type};
        }

        function saveToFile(results) {
          var blob = new Blob([angular.toJson(results, true)], {type: 'application/json'});
          saveAs(blob, 'export.json');
        }

        $scope.importAll = function (fileContents) {
          var docs;
          try {
            docs = JSON.parse(fileContents);
          } catch (e) {
            notify.error('The file could not be processed.');
          }

          // kibi: change the import to sequential to solve the dependency problem between objects
          // as visualisations could depend on searches
          // lets order the export to make sure that searches comes before visualisations
          // then also import object sequentially to avoid errors
          var configDocument = _.find(docs, function (o) {
            return o._type === 'config';
          });

          docs = _.filter(docs, function (doc) {
            return doc._type !== 'config';
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

          // kibi: override config properties
          var loadConfig = function (configDocument) {
            if (configDocument) {
              if (configDocument._id === kbnVersion) {
                // override existing config values
                _.each(configDocument._source, function (value, key) {
                  config.set(key, value);
                });
              } else {
                notify.error(
                  'Config object version [' + configDocument._id + '] in the import ' +
                  'does not match current version [' + kbnVersion + ']\n' +
                  'Will NOT import any of the advanced settings parameters'
                );
              }
            }
            // return Promise so we can chain the other part
            return Promise.resolve(true);
          };



          // kibi: now execute this sequentially
          var executeSequentially = function (docs) {
            var functionArray = [];
            _.each(docs, function (doc) {
              functionArray.push(function (previousOperationResult) {
                // previously this part was done in Promise.map
                var service = _.find($scope.services, {type: doc._type}).service;
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

          return loadConfig(configDocument).then(function () {
            return executeSequentially(docs);
          })
          .then(refreshIndex)
          .then(reloadQueries) // kibi: to clear backend cache
          .then(refreshData, notify.error);
        };


        function refreshIndex() {
          return es.indices.refresh({
            index: kbnIndex
          });
        }

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
