import { find, noop } from 'lodash';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import '../styles/kibi_virtual_indices.less';
import '../styles/saved_virtual_indices_finder.less';
import template from 'plugins/investigate_core/management/sections/kibi_virtual_indices/index.html';
import { CONFIRM_BUTTON, CANCEL_BUTTON } from 'ui_framework/components/modal/confirm_modal';

uiRoutes
.when('/management/siren/virtualindexes', {
  template,
  reloadOnSearch: false
})
.when('/management/siren/virtualindexes/:id?', {
  template,
  reloadOnSearch: false,
  resolve: {
    virtualIndex: function ($route, courier, jdbcDatasources) {
      //first try to get it from _siren/connector
      return jdbcDatasources.getVirtualIndex($route.current.params.id)
      .then(virtualIndex => {
        return virtualIndex;
      })
      .catch(err => {
        courier.redirectWhenMissing({
          virtualIndex: '/management/siren/virtualindexes'
        });
      });
    }
  }
});

function controller($scope, $route, jdbcDatasources, createNotifier, es, confirmModal, $element, kbnUrl) {

  if ($route.current.locals.virtualIndex) {
    $scope.virtualIndex = $route.current.locals.virtualIndex._source;
    $scope.virtualIndex.id = $route.current.locals.virtualIndex._id;
  }

  const notify = createNotifier({
    location: 'Virtual Index Pattern Editor'
  });

  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.isDeleteValid = function () {
    return $scope.virtualIndex && $scope.virtualIndex.id;
  };

  const fetchVirtualIndexes = function () {
    jdbcDatasources.listVirtualIndices().then(virtualIndexPatterns => {
      $scope.virtualIndexPatterns = virtualIndexPatterns;
    });
  };

  $scope.saveObject = function () {
    const confirmModalOptions = {
      title: 'Index created!',
      confirmButtonText: 'Yes, take me there',
      cancelButtonText: 'No, will do later',
      onConfirm: () => kbnUrl.change('/management/siren/indexesandrelations/', {}),
      onCancel: noop
    };
    const index = {
      _id: $scope.virtualIndex.id,
      _source: {
        datasource: $scope.datasource._id ? $scope.datasource._id : $scope.datasource,
        resource: $scope.virtualIndex.resource,
        key: $scope.virtualIndex.key,
        catalog: $scope.virtualIndex.catalog,
        schema: $scope.virtualIndex.schema
      }
    };

    return jdbcDatasources.createVirtualIndex(index).then(res => {
      if (res.created === true) {
        notify.info('Saved virtual index ' + index._id);
      } else if (res.updated === true) {
        notify.info('Saved virtual index ' + index._id);
      }
      confirmModal(
        'If you want to use this index data in the UI you should now add it in the “Indexes and Relationship” configuration.\n\n' +
        'Go now?',
        confirmModalOptions
      );
    }).catch(err => {
      notify.error(err);
    });
  };


  $scope.newObject = function () {
    kbnUrl.change('/management/siren/virtualindexes/', {});
  };

  $scope.jdbcDatasources = [];
  jdbcDatasources.list().then(datasources => {
    $scope.jdbcDatasources = datasources;
    if ($scope.virtualIndex) {
      $scope.datasource = find($scope.jdbcDatasources, '_id', $scope.virtualIndex.datasource);
    }
  });

  $scope.deleteObject = function () {
    const id = $scope.virtualIndex.id;
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

  // expose some methods to the navbar buttons
  [ 'isValid', 'newObject', 'saveObject', 'deleteObject', 'isDeleteValid' ]
  .forEach(name => {
    $element.data(name, $scope[name]);
  });
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
