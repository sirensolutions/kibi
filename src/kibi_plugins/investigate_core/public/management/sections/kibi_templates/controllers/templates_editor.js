import { ShouldEntityURIBeEnabledFactory } from 'ui/kibi/components/commons/_should_entity_uri_be_enabled';
import 'plugins/investigate_core/management/sections/kibi_templates/styles/kibi_templates.less';
import 'plugins/investigate_core/management/sections/kibi_templates/services/_saved_template';
import 'plugins/investigate_core/management/sections/kibi_templates/services/saved_templates';
import 'ui/kibi/components/query_engine_client/query_engine_client';
import 'ui/kibi/directives/kibi_dynamic_html';
import 'ui/kibi/directives/kibi_select';
import 'ui/kibi/directives/kibi_param_entity_uri';
import 'ace';
import 'angular-sanitize';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import angular from 'angular';
import template from 'plugins/investigate_core/management/sections/kibi_templates/index.html';

uiRoutes
.when('/management/siren/templates', {
  template,
  reloadOnSearch: false,
  resolve: {
    template: function (savedTemplates) {
      return savedTemplates.get();
    }
  }
})
.when('/management/siren/templates/:id?', {
  template,
  reloadOnSearch: false,
  resolve: {
    template: function ($route, courier, savedTemplates) {
      return savedTemplates.get($route.current.params.id)
      .catch(courier.redirectWhenMissing({
        template: '/management/siren/templates'
      }));
    }
  }
});

function controller($scope, $route, kbnUrl, Private, createNotifier, queryEngineClient, kibiState, $element, $routeParams) {
  const _shouldEntityURIBeEnabled = Private(ShouldEntityURIBeEnabledFactory);
  const notify = createNotifier({
    location: 'Templates editor'
  });

  $scope.holder = {
    entityURIEnabled: false,
    visible: true
  };
  $scope.preview = {
    queryId: null
  };

  $scope.$on('$destroy', function () {
    kibiState.removeTestEntityURI();
    kibiState.save();
  });

  $scope.jsonPreviewActive = false;
  $scope.htmlPreviewActive = true;
  $scope.tabClick = function (preview) {
    switch (preview) {
      case 'json':
        $scope.jsonPreviewActive = true;
        $scope.htmlPreviewActive = false;
        break;
      case 'html':
        $scope.jsonPreviewActive = false;
        $scope.htmlPreviewActive = true;
        break;
    }
  };

  const template = $scope.template = $route.current.locals.template;

  $scope.jumpToQuery = function () {
    kbnUrl.change('/management/siren/queries/' + _.get($scope, 'preview.queryId'));
  };

  const refreshPreview = function () {
    $scope.json_preview_content = 'Loading ...';
    $scope.html_preview_content = 'Loading ...';

    if (_.get($scope, 'preview.queryId')) {
      return queryEngineClient.getQueriesHtmlFromServer(
        [
          {
            open: true,
            queryId: _.get($scope, 'preview.queryId'),
            templateId: template.id,
            templateVars: {
              label: '{{config.templateVars.label}}'
            }
          }
        ],
        {
          selectedDocuments: kibiState.isSelectedEntityDisabled() ? [] : [ kibiState.getEntityURI() ],
          verbose: true
        }
      ).then(function (resp) {
        if (resp && resp.data && resp.data.snippets && resp.data.snippets.length === 1) {
          const snippet = resp.data.snippets[0];
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

  $scope.$listen(kibiState, 'save_with_changes', function (diff) {
    if (diff.indexOf(kibiState._properties.test_selected_entity) !== -1 && $scope.holder.entityURIEnabled) {
      refreshPreview();
    }
  });

  $scope.$watch('preview.queryId', function (queryId) {
    if (queryId) {
      _shouldEntityURIBeEnabled([ queryId ])
      .then((isEntityDependent) => {
        $scope.holder.entityURIEnabled = isEntityDependent;
        return refreshPreview();
      }).catch(notify.error);
    }
  });

  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.saveObject = function () {
    template.save()
    .then(function (id) {
      // here flush the cache and refresh preview
      return queryEngineClient.clearCache()
      .then(function () {
        notify.info(`Template ${template.title} successfuly saved`);
        if (id !== $routeParams.id) {
          kbnUrl.change(`/management/siren/templates/${id}`);
        } else {
          return refreshPreview();
        }
      }).catch(notify.error);
    });
  };

  $scope.aceLoaded = function (editor) {
    return;
  };

  $scope.newObject = function () {
    kbnUrl.change('/management/siren/templates', {});
  };

  // expose some methods to the navbar buttons
  [ 'isValid', 'newObject', 'saveObject' ]
  .forEach(name => {
    $element.data(name, $scope[name]);
  });
}

uiModules
.get('apps/management', ['kibana', 'ui.ace', 'ngSanitize'])
.controller('TemplatesEditor', controller);
