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
    const importExportHelper = Private(require('ui/kibi/helpers/import_export_helper'));
    // kibi: end

    return {
      restrict: 'E',
      controller: function ($scope, $injector, $q, AppState) {

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
          )
          .then((results) => {
            // kibi: add extra objects to the export
            return importExportHelper.addExtraObjectForExportAll(results);
          })
          .then((results) => {
            retrieveAndExportDocs(_.flattenDeep(results));
          });
        };

        function retrieveAndExportDocs(objs) {
          if (!objs.length) return notify.error('No saved objects to export.');
          // kibi: use savedObjectsAPI instead of es
          savedObjectsAPI.mget({
            body: {docs: objs.map(transformToMget)}
          })
          .then(function (response) {
            //kibi: sort the docs so the config is on the top
            const docs = response.docs.map(_.partialRight(_.pick, '_id', '_type', '_source'));
            importExportHelper.moveConfigToTop(docs);
            // kibi: end
            saveToFile(docs);
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

          return importExportHelper.importDocuments(docs, $scope.services, notify)
          .then(refreshKibanaIndex)
          .then(importExportHelper.reloadQueries) // kibi: to clear backend cache
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
