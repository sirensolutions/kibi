define(function (require) {

  require('css!plugins/kibi/datasources_editor/styles/datasources_editor.css');
  require('plugins/kibi/datasources_editor/services/saved_datasources/_saved_datasource');
  require('plugins/kibi/datasources_editor/services/saved_datasources/saved_datasources');
  require('angular-sanitize');
  require('ng-tags-input');

  require('routes')
  .when('/settings/datasources', {
    template: require('text!plugins/kibi/datasources_editor/index.html'),
    reloadOnSearch: false,
    resolve: {
      datasource: function (savedDatasources) {
        return savedDatasources.get();
      }
    }
  })
  .when('/settings/datasources/:id?', {
    template: require('text!plugins/kibi/datasources_editor/index.html'),
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


  var app = require('modules').get('apps/settings', ['kibana', 'ngSanitize', 'ngTagsInput']);
  var angular = require('angular');

  app.controller(
    'DatasourcesEditor',
    function ($rootScope, $scope, $route, $window, config, kbnUrl, Notifier,
              savedDatasources, Private, Promise, queryEngineClient, $element) {

      var setDatasourceSchema = Private(require('plugins/kibi/datasources_editor/lib/set_datasource_schema'));

      var notify = new Notifier({
        location: 'Datasources Configuration Editor'
      });

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

        if (config.file.datasource_encryption_warning) {
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

        if (datasource.datasourceType === 'sql_jdbc' || datasource.datasourceType === 'sparql_jdbc') {
          notify.warning('Changes in jdbc datasource require application restart. Please restart kibi');
        }

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
          notify.info('Datasource ' + datasource.title + ' successfully saved');
          queryEngineClient.clearCache().then(function () {
            kbnUrl.change('settings/datasources/' + datasourceId);
          });
        });
      };

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
