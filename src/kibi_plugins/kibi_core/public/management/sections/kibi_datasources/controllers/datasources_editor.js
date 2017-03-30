import 'plugins/kibi_core/management/sections/kibi_datasources/styles/datasources_editor.less';
import 'plugins/kibi_core/management/sections/kibi_datasources/services/_saved_datasource';
import 'plugins/kibi_core/management/sections/kibi_datasources/services/saved_datasources';
import 'ui/kibi/components/query_engine_client/query_engine_client';
import 'ui/kibi/directives/kibi_validate';
import SetDatasourceSchemaProvider from 'plugins/kibi_core/management/sections/kibi_datasources/lib/set_datasource_schema';
import template from 'plugins/kibi_core/management/sections/kibi_datasources/index.html';
import angular from 'angular';
import kibiUtils from 'kibiutils';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';

uiRoutes
.when('/management/kibana/datasources', {
  template,
  reloadOnSearch: false,
  resolve: {
    datasource: function (savedDatasources) {
      return savedDatasources.get();
    }
  }
})
.when('/management/kibana/datasources/:id?', {
  template,
  reloadOnSearch: false,
  resolve: {
    datasource: function ($route, courier, savedDatasources) {
      return savedDatasources.get($route.current.params.id)
      .catch(courier.redirectWhenMissing({
        datasource: '/management/kibana/datasources'
      }));
    }
  }
});

function controller(Private, $window, $scope, $route, kbnUrl, createNotifier, queryEngineClient, $element, kibiWarnings,
  kibiEnterpriseEnabled) {
  const setDatasourceSchema = Private(SetDatasourceSchemaProvider);
  const notify = createNotifier({
    location: 'Datasources Configuration Editor'
  });
  const datasource = $scope.datasource = $route.current.locals.datasource;

  $scope.kibiEnterpriseEnabled = kibiEnterpriseEnabled;

  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.saveObject = function () {
    if (kibiWarnings.datasource_encryption_warning) {
      let encrypted = false;
      for (let s = 0; s < datasource.schema.length; s++) {
        const field = datasource.schema[s];
        if (field.encrypted) {
          encrypted = true;
          break;
        }
      }
      if (encrypted && !$window.confirm('You haven\'t set a custom encryption key;' +
          ' are you sure you want to save this datasource?')) {
        return;
      }
    }

    if (kibiUtils.isJDBC(datasource.datasourceType)) {
      const msg = 'Changes in a JDBC datasource requires the application to be restarted. ' +
        'Please restart Kibi and do not forget to set kibi_core.load_jdbc to true.';
      notify.warning(msg);
    }

    if (datasource.datasourceType === kibiUtils.DatasourceTypes.tinkerpop3) {
      const datasourceUrl = datasource.datasourceParams.url;
      const baseUrl = datasourceUrl.replace(/\/graph\/query(Batch)?/, '');

      queryEngineClient.gremlinPing(baseUrl).then(function (response) {
        if (response.data.error) {
          notify.warning('Kibi Gremlin Server not available at this address: ' + baseUrl + '. Please check the configuration');
        } else {
          _saveDatasource(datasource);
        }
      })
      .catch(function (err) {
        notify.warning('Kibi Gremlin Server not available at this address: ' + baseUrl + '. Please check the configuration');
      });
    } else {
      _saveDatasource(datasource);
    }
  };

  function _saveDatasource(datasource) {
    // make sure that any parameter which does not belong to the schema
    // is removed from datasourceParams
    for (const prop in datasource.datasourceParams) {
      if (datasource.datasourceParams.hasOwnProperty(prop)) {
        let remove = true;
        for (let j = 0; j < datasource.schema.length; j++) {
          if (datasource.schema[j].name === prop) {
            remove = false;
            break;
          }
        }
        if (remove) {
          delete datasource.datasourceParams[prop];
        }
      }
    }

    datasource.save().then(function (datasourceId) {
      if (datasourceId) {
        notify.info('Datasource ' + datasource.title + ' successfully saved');
        queryEngineClient.clearCache().then(function () {
          kbnUrl.change('management/kibana/datasources/' + datasourceId);
        });
      }
    });
  }

  $scope.newObject = function () {
    kbnUrl.change('management/kibana/datasources', {});
  };

  $scope.$watch('datasource.datasourceType', function () {
    // here reinit the datasourceDef
    setDatasourceSchema(datasource);
  });
}

uiModules
.get('apps/management', ['kibana'])
.controller('DatasourcesEditor', controller);
