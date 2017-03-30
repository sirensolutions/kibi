import { onVisualizePage } from 'ui/kibi/utils/on_page';
import 'ui/kibi/directives/kibi_select';
import 'ui/kibi/directives/kibi_array_param';
import 'ui/kibi/directives/kibi_param_entity_uri';
import 'ui/kibi/components/query_engine_client/query_engine_client';
import uiModules from 'ui/modules';
import _ from 'lodash';
import kibiUtils from 'kibiutils';

/*global alert:false */
uiModules
.get('kibana/kibi_query_viewer_vis', ['kibana'])
.controller('KibiQueryViewerVisController', function ($rootScope, $scope, kibiState, queryEngineClient, createNotifier) {
  const notify = createNotifier({
    location: 'Kibi Query Viewer'
  });

  // generate random id to avoid collisions if there are multiple widgets on one dashboard
  $scope.snippetContainerId = kibiUtils.getUuid4();

  const configMode = onVisualizePage();
  $scope.holder = {
    html: ''
  };

  $scope.$watch(function (myscope) {
    return [
      _.map(myscope.vis.params.queryDefinitions, 'templateId'),
      _.map(myscope.vis.params.queryDefinitions, '_label'),
      _.map(myscope.vis.params.queryDefinitions, '_templateVarsString'),
      _.map(myscope.vis.params.queryDefinitions, 'queryId')
    ];
  }, function () {
    if ($scope.vis && $scope.vis.params.queryDefinitions && $scope.vis.params.queryDefinitions.length) {
      $scope.renderTemplates();
    }
  }, true);

  $scope.$listen(kibiState, 'save_with_changes', function (diff) {
    if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
        diff.indexOf(kibiState._properties.test_selected_entity) !== -1 ||
        diff.indexOf(kibiState._properties.selected_entity_disabled) !== -1) {
      $scope.renderTemplates();
    }
  });

  // when autoupdate is on we detect the refresh here
  const removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', function (event) {
    $scope.renderTemplates();
  });

  $scope.$on('$destroy', function () {
    removeAutorefreshHandler();
  });

  $scope.renderTemplates = function () {
    if (!$scope.vis.params.queryDefinitions || $scope.vis.params.queryDefinitions.length === 0) {
      $scope.holder.html = '';
      $scope.holder.activeFetch = false;
      return;
    }

    $scope.holder.activeFetch = true;
    return queryEngineClient.getQueriesHtmlFromServer(
      $scope.vis.params.queryDefinitions,
      {
        selectedDocuments: kibiState.isSelectedEntityDisabled() ? [] : [ kibiState.getEntityURI() ]
      }
    ).then(function (resp) {
      $scope.holder.activeFetch = false;

      $scope.emptyResults = !resp.data.snippets || resp.data.snippets.length === 0;
      $scope.noSelectedDocument = resp.data.error === 'Empty selected document uri';

      if (resp.data.error && resp.data.error !== 'Empty selected document uri') {
        let msg  = '';
        if (typeof resp.data.error === 'string') {
          msg = resp.data.error;
        } else {
          msg = JSON.stringify(resp.data.error, null, '');
        }
        notify.warning(msg);
        return;
      }

      let emptyResultsTemplate = '';
      if (configMode) {
        emptyResultsTemplate =
          '<div class="snippetContainer">' +
          '  <div class="snippet-@INDEX@">' +
          '    <div class="templateResult results-not-ok-verbose">' +
          '      <i class="fa fa-warning"></i>' +
          '        @MESSAGE@' +
          '    </div>' +
          '  </div>' +
          '</div>';

      } else {
        emptyResultsTemplate =
          '<div class="snippetContainer">' +
          '  <div class="snippet-@INDEX@">' +
          '    <div class="templateResult results-not-ok-less-verbose">' +
          '      @MESSAGE@' +
          '    </div>' +
          '  </div>' +
          '</div>';
      }


      if ($scope.emptyResults && !$scope.noSelectedDocument) {

        $scope.holder.html = 'No result';

      } else if ($scope.noSelectedDocument) {

        $scope.holder.html = emptyResultsTemplate
        .replace(/@INDEX@/, 0)
        .replace(/@MESSAGE@/, 'No selected document, please select one');
        return;

      } else {

        $scope.holder.html = '';
        let emptyResultsMsgCounter = 0;
        _.forEach(resp.data.snippets, function (snippet, index) {

          if (snippet.queryActivated === false) {

            let message = '';
            if (!configMode) {
              // if in view mode increase the counter
              emptyResultsMsgCounter++;
              // show only 1 message when in "view" mode
              if (emptyResultsMsgCounter > 1) {
                return;
              }
              message = 'No query template is triggered now. Select a document?';
            } else {
              message = `Query <b>${snippet.data.config.id}</b> not activated, select another document or check activation rules`;
            }

            $scope.holder.html += emptyResultsTemplate
            .replace(/@INDEX@/, 0)
            .replace(/@MESSAGE@/, message);
            return;
          }

          if (snippet.error) {
            $scope.holder.html += emptyResultsTemplate.replace(/@INDEX@/, 0);
            let msg = `Error processing query <b>${snippet.data.config.id}</b>`;
            if (configMode) {
              const results = JSON.stringify(snippet.data.results, null, ' ');
              msg += `:<br/><pre>${snippet.error}</pre><br/>Results property available in the template:<br/><pre>${results}</pre>`;
            }
            $scope.holder.html = $scope.holder.html.replace(/@MESSAGE@/, msg);
            return;
          }

          $scope.holder.html +=
            `<div class="snippetContainer">
          <div class="snippet-${index}">
          <div class="templateResult">${snippet.html}</div>
          </div>
          </div>`;
        });
      }

    }).catch(notify.error);
  };

});
