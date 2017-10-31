import { find } from 'lodash';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import template from 'plugins/kibi_core/management/sections/kibi_virtual_indices/index.html';

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
  // kibiL: end

  $scope.delete = function (id) {
    // first check if there is an underlying physical pattern
    es.indices.get({ index: id })
    .then(res => {
      if (res[id]) {
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
          `You are about to delete the virtual index pattern [${id}].
           There is also an underlying physical index with the same name [${id}].`,
          confirmModalOptions
        );
      }
    })
    .catch(err => {
      if (err.status === 404 && err.displayName === 'NotFound') {
        // just delete the virtual one
        jdbcDatasources.deleteVirtualIndex(id).then(() => {
          notify.info('Virtual index pattern deleted');
        })
        .catch(err => {
          notify.error(err);
        });
      } else {
        notify.error(err);
      }
    });
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
