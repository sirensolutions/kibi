import { find, noop, sortBy } from 'lodash';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import '../styles/kibi_virtual_indices.less';
import '../styles/saved_virtual_indices_finder.less';
import template from 'plugins/investigate_core/management/sections/kibi_virtual_indices/index.html';

uiRoutes
.when('/management/siren/virtualindices', {
  template,
  reloadOnSearch: false
})
.when('/management/siren/virtualindices/:id?', {
  template,
  reloadOnSearch: false,
  resolve: {
    virtualIndex: function ($route, courier, jdbcDatasources, kbnUrl, createNotifier) {
      const notify = createNotifier({
        location: 'Virtual indices editor'
      });
      return jdbcDatasources.getVirtualIndex($route.current.params.id)
      .catch(error => {
        if (error.status === 404) {
          notify.error(`Virtual index ${$route.current.params.id} not found.`);
        } else {
          notify.error(error);
        }
        kbnUrl.redirect('/management/siren/virtualindices');
      });
    }
  }
});

function controller($scope, $route, jdbcDatasources, createNotifier, confirmModal, $element, kbnUrl, mappings) {

  $scope.virtualIndex = {};

  const notify = createNotifier({
    location: 'Virtual indices editor'
  });

  const resetBrowser = function () {
    $scope.displayDatasourceBrowser = false;

    $scope.datasourceMetadata = {
      name: '',
      toggled: false,
      children: []
    };
  };
  resetBrowser();

  const selectResource = function (node) {
    $scope.virtualIndex.key = null;
    $scope.virtualIndex.resource = node.name;
    if (node.catalog !== '') {
      $scope.virtualIndex.catalog = node.catalog;
    } else {
      $scope.virtualIndex.catalog = null;
    }
    if (node.schema !== '') {
      $scope.virtualIndex.schema = node.schema;
    } else {
      $scope.virtualIndex.schema = null;
    }
  };

  const loadResources = function (node) {
    const datasourceName = $scope.datasource;
    return jdbcDatasources.getMetadata($scope.datasource, node.catalog, node.name)
      .then(metadata => {
        if (datasourceName !== $scope.datasource) {
          return;
        }
        const catalogResult = find(metadata.catalogs, result => result.name === node.catalog);
        if (!catalogResult) {
          return [];
        }

        const schemaResult = find(catalogResult.schemas, result => result.name === node.name);
        if (schemaResult) {
          return sortBy(schemaResult.resources.map(schema => ({
            schema: node.name,
            catalog: node.catalog,
            name: schema.name,
            toggleFunction: selectResource,
            type: 'resource'
          })), node => node.name);
        }
        return [];
      })
      .catch(error => {
        if (datasourceName !== $scope.datasource) {
          return;
        }
        notify.error(error);
        throw error;
      });
  };

  const loadSchemas = function (node) {
    const datasourceName = $scope.datasource;
    return jdbcDatasources.getMetadata($scope.datasource, node.name)
    .then(metadata => {
      if (datasourceName !== $scope.datasource) {
        return;
      }
      const catalogResult = find(metadata.catalogs, result => result.name === node.name);
      if (catalogResult) {
        return sortBy(catalogResult.schemas.map(schema => ({
          name: schema.name,
          type: 'schema',
          catalog: node.name,
          toggled: false,
          loaded: false,
          childrenFunction: loadResources,
          children: []
        })), node => node.name);
      }
      return [];
    })
    .catch(error => {
      if (datasourceName !== $scope.datasource) {
        return;
      }
      notify.error(error);
      throw error;
    });
  };

  const loadCatalogs = function (node) {
    const datasourceName = $scope.datasource;
    return jdbcDatasources.getMetadata(datasourceName)
    .then(metadata => {
      if (datasourceName !== $scope.datasource) {
        return;
      }
      return sortBy(metadata.catalogs.map(catalog => ({
        name: catalog.name,
        type: 'catalog',
        toggled: false,
        childrenFunction: loadSchemas,
        children: []
      })), node => node.name);
    })
    .catch(error => {
      if (datasourceName !== $scope.datasource) {
        return;
      }
      notify.error(error);
      throw error;
    });
  };

  $scope.$watch('datasource', datasourceName => {
    if (!datasourceName) {
      resetBrowser();
      return;
    }
    $scope.displayDatasourceBrowser = true;
    $scope.datasourceMetadata = {
      name: datasourceName,
      type: 'datasource',
      childrenFunction: loadCatalogs,
      loaded: false,
      children: [],
      toggled: false
    };
  });

  $scope.isNew = true;
  if ($route.current.locals.virtualIndex) {
    $scope.virtualIndex = $route.current.locals.virtualIndex._source;
    $scope.virtualIndex.id = $route.current.locals.virtualIndex._id;
    $scope.datasource = $scope.virtualIndex.datasource;
    $scope.isNew = false;
  }

  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.isDeleteValid = function () {
    return !$scope.isNew;
  };

  $scope.saveObject = function () {
    const confirmModalOptions = {
      title: 'Index created!',
      confirmButtonText: 'Yes, take me there',
      cancelButtonText: 'No, will do later',
      onConfirm: () => kbnUrl.change('/management/siren/indexesandrelations/create/' + $scope.virtualIndex.id, {}),
      onCancel: noop
    };
    const index = {
      _id: $scope.virtualIndex.id,
      _source: {
        datasource: $scope.datasource,
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
        mappings.clearCache();
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
    kbnUrl.change('/management/siren/virtualindices/', {});
  };

  $scope.jdbcDatasources = [];
  jdbcDatasources.list().then(datasources => {
    $scope.jdbcDatasources = datasources;
    if (!$scope.isNew) {
      const result = find($scope.jdbcDatasources, '_id', $scope.virtualIndex.datasource);
      if (result) {
        $scope.datasource = result._id;
      }
    }
  });

  $scope.deleteObject = function () {
    const id = $scope.virtualIndex.id;
    const confirmModalOptions = {
      confirmButtonText: 'Delete the virtual index',
      onConfirm: () => {
        jdbcDatasources.deleteVirtualIndex(id).then(() => {
          notify.info(`Virtual index ${id} successfully deleted`);
          kbnUrl.change('/management/siren/virtualindices/', {});
        }).catch(err => {
          notify.error(err);
        });
      }
    };
    confirmModal(
      `Are you sure you want to delete the virtual index ${id}?`,
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
        return input.toLowerCase() === input;
      };

      ngModel.$validators.indexNameInput = function (modelValue, viewValue) {
        return isValid(viewValue);
      };
    }
  };
});
