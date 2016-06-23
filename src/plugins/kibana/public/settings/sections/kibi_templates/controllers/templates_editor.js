define(function (require) {

  var _ = require('lodash');
  require('plugins/kibana/settings/sections/kibi_templates/styles/kibi_templates.less');
  require('plugins/kibana/settings/sections/kibi_templates/services/_saved_template');
  require('plugins/kibana/settings/sections/kibi_templates/services/saved_templates');

  require('ui/kibi/components/query_engine_client/query_engine_client');

  require('ui/kibi/directives/kibi_dynamic_html');
  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_param_entity_uri');

  require('ace');
  require('angular-sanitize');

  require('ui/routes')
  .when('/settings/templates', {
    template: require('plugins/kibana/settings/sections/kibi_templates/index.html'),
    reloadOnSearch: false,
    resolve: {
      template: function (savedTemplates) {
        return savedTemplates.get();
      }
    }
  })
  .when('/settings/templates/:id?', {
    template: require('plugins/kibana/settings/sections/kibi_templates/index.html'),
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


  var app = require('ui/modules').get('apps/settings', ['kibana', 'ui.ace', 'ngSanitize']);
  var angular = require('angular');

  app.controller(
    'TemplatesEditor',
    function ($rootScope, $scope, $route, $window, kbnUrl, Private, SavedTemplate, savedQueries, savedDatasources,
              savedTemplates, createNotifier, queryEngineClient, $element) {
      var _shouldEntityURIBeEnabled = Private(require('ui/kibi/components/commons/_should_entity_uri_be_enabled'));
      var _setEntityURI =  Private(require('ui/kibi/components/commons/_set_entity_uri'));

      var notify = createNotifier({
        location: 'Templates editor'
      });

      $scope.holder = {
        entityURI: '',
        entityURIEnabled: false,
        visible: true
      };

      _setEntityURI($scope.holder);
      var off = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
        _setEntityURI($scope.holder);
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
            }
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
        if ($scope.template._previewQueryId) {
          _shouldEntityURIBeEnabled([$scope.template._previewQueryId])
            .then(function (entityURIEnabled) {
              $scope.holder.entityURIEnabled = entityURIEnabled;
            }).then(savedQueries.get($scope.template._previewQueryId))
          .then((savedQuery) => savedQuery && savedDatasources.get(savedQuery.datasourceId))
            .then((savedDatasource) => {
              // set datasourceType
              if (savedDatasource) {
                $scope.datasourceType = savedDatasource.type;
              }
            }).catch(notify.error);

          refreshPreview();
        }
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

      $scope.aceLoaded = function (editor) {
        return;
      };

      $scope.newTemplate = function () {
        kbnUrl.change('/settings/templates', {});
      };
    });
});
