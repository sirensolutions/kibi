import { find } from 'lodash';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import template from 'plugins/kibi_core/management/sections/kibi_virtual_indices/index.html';
import { CONFIRM_BUTTON, CANCEL_BUTTON } from 'ui_framework/components/modal/confirm_modal';

uiRoutes
.when('/management/siren/virtualindices', {
  template,
  reloadOnSearch: false,
});

function controller($scope, jdbcDatasources, createNotifier, es, confirmModal) {

  const notify = createNotifier({
    location: 'Virtual Index Pattern Editor'
  });

  const fetchVirtualIndexes = function () {
    jdbcDatasources.listVirtualIndices().then(virtualIndexPatterns => {
      $scope.virtualIndexPatterns = virtualIndexPatterns;
    });
  };

  fetchVirtualIndexes();

  // kibi: code to handle creation of jdbc datasource based index patterns
  $scope.jdbcFormValues = {
    datasource: null,
    resource: null,
    key: null,
    name: null
  };

  $scope.jdbcDatasources = [];
  jdbcDatasources.list().then(datasources => {
    $scope.jdbcDatasources = datasources;
  });

  $scope.registerJdbcIndexPattern = () => {
    const index = {
      _id: $scope.jdbcFormValues.name,
      _source: {
        datasource: $scope.jdbcFormValues.datasource,
        resource: $scope.jdbcFormValues.resource,
        key: $scope.jdbcFormValues.key
      }
    };

    jdbcDatasources.createVirtualIndex(index).then(res => {
      if (res.created === true) {
        notify.info('Virtual Index Pattern created');
        fetchVirtualIndexes();
      }
    }).catch(err => {
      notify.error(err);
    });
  };
  // kibi: end

  $scope.delete = function (id) {
    // found a physical index lets ask user to delete it as well
    const confirmModalOptions = {
      confirmButtonText: 'Delete the virtual index',
      onConfirm: () => {
        jdbcDatasources.deleteVirtualIndex(id).then(() => {
          notify.info(`Virtual index pattern ${id} successfully deleted`);
          fetchVirtualIndexes();
        }).catch(err => {
          notify.error(err);
        });
      }
    };
    confirmModal(
      `Are you sure you want to delete the virtual index [${id}].`,
      confirmModalOptions
    );
  };

}

uiModules
.get('apps/management', ['kibana'])
.controller('VirtualIndicesController', controller)
.directive('validateJdbcIndexName', function () {
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function ($scope, elem, attr, ngModel) {
      const illegalCharacters = ['\\', '/', '?', '"', '<', '>', '|', ' ', ','];
      const isValid = function (input) {
        if (input == null || input === '' || input === '.' || input === '..') return false;

        const match = find(illegalCharacters, function (character) {
          return input.indexOf(character) >= 0;
        });
        if (match) {
          return false;
        }
        if (input.toLowerCase() !== input) {
          return false;
        }
        return true;
      };

      ngModel.$validators.indexNameInput = function (modelValue, viewValue) {
        return isValid(viewValue);
      };
    }
  };
});
