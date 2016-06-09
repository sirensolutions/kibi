define(function (require) {

  require('plugins/kibana/settings/sections/kibi_datasources/styles/datasources_editor.less');
  require('plugins/kibana/settings/sections/kibi_datasources/services/_saved_datasource');
  require('plugins/kibana/settings/sections/kibi_datasources/services/saved_datasources');

  require('ui/kibi/components/query_engine_client/query_engine_client');

  require('ui/routes')
  .when('/settings/datasources', {
    template: require('plugins/kibana/settings/sections/kibi_datasources/index.html'),
    reloadOnSearch: false,
    resolve: {
      datasource: function (savedDatasources) {
        return savedDatasources.get();
      }
    }
  })
  .when('/settings/datasources/:id?', {
    template: require('plugins/kibana/settings/sections/kibi_datasources/index.html'),
    reloadOnSearch: false,
    resolve: {
      datasource: function ($route, courier, savedDatasources) {
        return savedDatasources.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'datasource' : '/settings/datasources'
        }));
      }
    }
  });


  var app = require('ui/modules').get('apps/settings', ['kibana']);
  var angular = require('angular');
  var kibiUtils = require('kibiutils');

  app.controller(
    'DatasourcesEditor',
    function ($rootScope, $scope, $route, $window, kbnUrl, createNotifier, savedDatasources,
              Private, queryEngineClient, $element, kibiWarnings, kibiEnterpriseEnabled) {

      var setDatasourceSchema = Private(require('plugins/kibana/settings/sections/kibi_datasources/lib/set_datasource_schema'));

      var notify = createNotifier({
        location: 'Datasources Configuration Editor'
      });

      $scope.kibiEnterpriseEnabled = kibiEnterpriseEnabled;

      $scope.datasourcesFinderOpen = false;

      $scope.openDatasourcesFinder = function () {
        $scope.datasourcesFinderOpen = true;
      };
      $scope.closeDatasourcesFinder = function (hit, event) {
        $scope.datasourcesFinderOpen = false;
        kbnUrl.change('settings/datasources/' + hit.id);
      };

      var datasource = $scope.datasource = $route.current.locals.datasource;

      $scope.submit = function () {
        if (!$element.find('form[name="objectForm"]').hasClass('ng-valid')) {
          $window.alert('Please fill in all the required parameters.');
          return;
        }

        if (kibiWarnings.datasource_encryption_warning) {
          var encrypted = false;
          var field;
          for (var s = 0; s < datasource.schema.length; s++) {
            field = datasource.schema[s];
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

        if (kibiUtils.isSQL(datasource.datasourceType)) {
          const msg = 'Changes in jdbc datasource require application restart. ' +
            'Please restart kibi and do not forget to set kibi_core.load_jdbc to true.';
          notify.warning(msg);
        }

        if (datasource.datasourceType === kibiUtils.DatasourceType.tinkerpop3) {
          const baseUrl = datasource.datasourceParams.url.replace('/graph/query', '');

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
        datasource.id = datasource.title;

        // make sure that any parameter which does not belong to the schema
        // is removed from datasourceParams
        for (var prop in datasource.datasourceParams) {
          if (datasource.datasourceParams.hasOwnProperty(prop)) {
            var remove = true;
            for (var j = 0; j < datasource.schema.length; j++) {
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
              kbnUrl.change('settings/datasources/' + datasourceId);
            });
          }
        });
      }

      $scope.delete = function () {
        if ($window.confirm('Are you sure you want to delete the datasource [' + datasource.title + ']')) {
          datasource.delete().then(function (resp) {
            queryEngineClient.clearCache().then(function () {
              kbnUrl.change('settings/datasources', {});
            });
          });
        }
      };

      $scope.newDatasource = function () {
        kbnUrl.change('settings/datasources', {});
      };

      $scope.clone = function () {
        savedDatasources.get().then(function (savedDatasourceClone) {
          savedDatasourceClone.id = datasource.id + '-clone';
          savedDatasourceClone.title = datasource.title + ' clone';
          savedDatasourceClone.description = datasource.description;

          savedDatasourceClone.save().then(function (resp) {
            notify.info('Datasource ' + savedDatasourceClone.title + 'successfully saved');
            queryEngineClient.clearCache().then(function () {
              $rootScope.$emit('kibi:datasource:changed', resp);
              kbnUrl.change('settings/datasources/' + resp);
            });
          });
        });
      };

      $scope.$watch('datasource.datasourceType', function () {
        // here reinit the datasourceDef
        setDatasourceSchema(datasource);
      });

    });
});
