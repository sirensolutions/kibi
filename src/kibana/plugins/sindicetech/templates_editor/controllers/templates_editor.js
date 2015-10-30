define(function (require) {

  var _ = require('lodash');
  require('css!plugins/sindicetech/templates_editor/styles/templates_editor.css');
  require('plugins/sindicetech/templates_editor/services/saved_templates/_saved_template');
  require('plugins/sindicetech/templates_editor/services/saved_templates/saved_templates');
  require('directives/st_dynamic_html');
  require('angular-sanitize');
  require('angular-ui-ace');

  require('routes')
  .when('/settings/templates', {
    template: require('text!plugins/sindicetech/templates_editor/index.html'),
    reloadOnSearch: false,
    resolve: {
      template: function (savedTemplates) {
        return savedTemplates.get();
      }
    }
  })
  .when('/settings/templates/:id?', {
    template: require('text!plugins/sindicetech/templates_editor/index.html'),
    reloadOnSearch: false,
    resolve: {
      template: function ($route, courier, savedTemplates) {
        return savedTemplates.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'template' : '/settings/templates'
        }));
      }
    }
  });


  var app = require('modules').get('apps/settings', ['kibana', 'ui.ace', 'ngSanitize']);
  var angular = require('angular');

  app.controller(
    'TemplatesEditor',
    function ($rootScope, $scope, config, $route, $window,
              kbnUrl, Private, SavedTemplate, savedQueries, savedTemplates, Notifier, queryEngineClient, $compile, $element
  ) {

      var _shouldEntityURIBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));
      var _set_entity_uri =  Private(require('plugins/kibi/commons/_set_entity_uri'));

      var notify = new Notifier({
        location: 'Templates editor'
      });

      $scope.holder = {
        entityURI: '',
        entityURIEnabled: false,
        visible: true
      };

      _set_entity_uri($scope.holder);
      var off = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
        _set_entity_uri($scope.holder);
      });
      $scope.$on('$destroy', off);


      $scope.jsonPreviewActive = false;
      $scope.htmlPreviewActive = true;
      $scope.tabClick = function () {
        $scope.jsonPreviewActive = !$scope.jsonPreviewActive;
        $scope.htmlPreviewActive = !$scope.htmlPreviewActive;
      };


      $scope.templateFinderOpen = false;
      $scope.openTemplateFinder = function () {
        $scope.templateFinderOpen = true;
      };
      $scope.closeTemplateFinder = function (hit, event) {
        $scope.templateFinderOpen = false;
        kbnUrl.change('settings/templates/' + hit.id);
      };

      var template = $scope.template = $route.current.locals.template;
      $scope.$templateTitle = $route.current.locals.template.title;


      $scope.jumpToQuery = function () {
        kbnUrl.change('/settings/queries/' + $scope.template._previewQueryId);
      };

      var refreshPreview = function () {
        $scope.json_preview_content = 'Loading ...';
        $scope.html_preview_content = 'Loading ...';

        if ($scope.template._previewQueryId && $scope.template._previewQueryId !== '') {

          queryEngineClient.getQueriesHtmlFromServer(
            [
              {
                open: true,
                queryId: $scope.template._previewQueryId,
                showFilterButton: false,
                templateId: template.id,
                templateVars: {
                  label: '{{config.templateVars.label}}'
                }
              }
            ],
            {
              selectedDocuments: [$scope.holder.entityURI]
            },
            true
          ).then(function (resp) {
            if (resp && resp.data && resp.data.snippets && resp.data.snippets.length === 1) {
              var snippet = resp.data.snippets[0];
              $scope.json_preview_content = JSON.stringify(snippet, null, ' ');

              if (snippet.queryActivated === true) {
                $scope.html_preview_content = snippet.html;
              } else {
                $scope.html_preview_content = 'Query deactivated. Check activation query or change entity URI';
              }
            }
          });
        }
      };


      $scope.$watch('template._previewQueryId', function () {
        _shouldEntityURIBeEnabled([$scope.template._previewQueryId]).then(function (entityURIEnabled) {
          $scope.holder.entityURIEnabled = entityURIEnabled;
        }).catch(notify.error);

        // set datasourceType
        savedQueries.get($scope.template._previewQueryId).then(function (savedQuery) {

          var foundDatasource = _.find(config.file.datasources, function (datasource) {
            return datasource.id === savedQuery.st_datasourceId;
          });
          if (foundDatasource) {
            $scope.datasourceType = foundDatasource.type;
          }
        });

        refreshPreview();
      });

      $scope.submit = function () {
        if (!$element.find('form[name="objectForm"]').hasClass('ng-valid')) {
          $window.alert('Please fill in all the required parameters.');
          return;
        }
        var titleChanged = $scope.$templateTitle !== $scope.template.title;
        template.id = template.title;
        template.save().then(function (resp) {
          // here flush the cache and refresh preview
          queryEngineClient.clearCache().then(function () {
            notify.info('Template ' + template.title + 'successfuly saved');
            if (titleChanged) {
              kbnUrl.change('/settings/templates/' + template.id);
            } else {
              refreshPreview();
            }
          });
        });
      };

      $scope.delete = function () {
        if ($window.confirm('Are you sure about deleting [' + template.title + ']')) {
          template.delete().then(function (resp) {
            kbnUrl.change('/settings/templates', {});
          });
        }
      };

      //TODO understand how the validation was done in object editor
      $scope.aceLoaded = function (editor) {
        return;
      };

      $scope.newTemplate = function () {
        kbnUrl.change('/settings/templates', {});
      };

      $scope.clone = function () {
        template.id = template.title + '-clone';
        template.title = template.title + ' clone';
        template.save().then(function (resp) {
          // here flush the cache and refresh preview
          queryEngineClient.clearCache().then(function () {
            notify.info('Template ' + template.title + 'successfuly saved');
            kbnUrl.change('/settings/templates/' + template.id);
          });
        });
      };

    });
});
