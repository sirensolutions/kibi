import { onVisualizePage } from 'ui/kibi/utils/on_page';
import 'ui/kibi/directives/kibi_select';
import 'ui/kibi/directives/kibi_array_param';
import 'ui/kibi/directives/kibi_param_entity_uri';
import 'ui/kibi/components/query_engine_client/query_engine_client';
import { uiModules } from 'ui/modules';
import _ from 'lodash';
import kibiUtils from 'kibiutils';

/*global alert:false */
uiModules
.get('kibana/kibi_query_viewer_vis', ['kibana'])
.controller('KibiQueryViewerVisController', function ($rootScope, $scope, kibiState, queryEngineClient, createNotifier, timefilter) {
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
    if ((timefilter.refreshInterval.display !== 'Off')
        && (timefilter.refreshInterval.pause === false)) {
      $scope.renderTemplates();
    }
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
        selectedDocuments: kibiState.isSelectedEntityDisabled() ? [] : [ kibiState.getEntityURI() ],
        verbose: configMode
      }
    ).then(function (resp) {
      $scope.holder.activeFetch = false;

      $scope.emptyResults = !resp.data.snippets || resp.data.snippets.length === 0;

      if (resp.data.error) {
        let msg  = '';
        if (typeof resp.data.error === 'string') {
          msg = resp.data.error;
        } else {
          msg = JSON.stringify(resp.data.error, null, '');
        }
        notify.warning(msg);
        return;
      }

      if ($scope.emptyResults) {
        $scope.holder.html = 'No result';
      } else {
        $scope.holder.html = '';
        let queryNotActivatedMsgCounter = 0;
        _.each(resp.data.snippets, function (snippet, index) {
          if (!snippet.queryActivated && !configMode) {
            // if in view mode show the message only once
            queryNotActivatedMsgCounter++;
            if (queryNotActivatedMsgCounter > 1) {
              return;
            }
          }

          if (snippet.error) {
            let msg = `Error processing query <b>${snippet.data.config.label}</b>:<br/><pre>${snippet.error.message}</pre>`;
            if (configMode) {
              if (snippet.data.results) {
                const results = JSON.stringify(snippet.data.results, null, ' ');
                msg += `<br/>Results property available in the template:<br/><pre>${results}</pre>`;
              }
            }
            $scope.holder.html +=
              `<div class="snippetContainer">
                <div class="snippet-${index}">
                <div class="templateResult">${msg}</div>
                </div>
              </div>`;
          } else {
            $scope.holder.html +=
              `<div class="snippetContainer">
                <div class="snippet-${index}">
                <div class="templateResult ${snippet.classes || ''}">${snippet.html}</div>
                </div>
              </div>`;
          }
        });
      }
    }).catch(notify.error);
  };

});
