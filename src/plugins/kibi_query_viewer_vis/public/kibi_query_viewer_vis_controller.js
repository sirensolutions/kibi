/*global alert:false */
define(function (require) {
  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');
  require('ui/kibi/directives/kibi_param_entity_uri');
  require('ui/kibi/components/query_engine_client/query_engine_client');

  var module = require('ui/modules').get('kibana/kibi_query_viewer_vis', ['kibana']);
  var _ = require('lodash');
  var kibiUtils = require('kibiutils');

  module.controller(
    'KibiQueryViewerVisController',
    function ($rootScope, $scope, globalState, Private, queryEngineClient, createNotifier) {
      var urlHelper = Private(require('ui/kibi/helpers/url_helper'));
      var notify = createNotifier({
        location: 'Kibi Query Viewer'
      });

      // generate random id to avoid collisions if there are multiple widgets on one dashboard
      $scope.snippetContainerId = kibiUtils.getUuid4();

      const configMode = urlHelper.onVisualizeTab();
      $scope.holder = {
        entityURI: '',
        html: ''
      };

      if (globalState.se && globalState.se.length > 0 && globalState.entityDisabled === false) {
        $scope.holder.entityURI = globalState.se[0];
      } else {
        $scope.holder.entityURI = '';
      }

      $scope.$watch(function (myscope) {
        return [
          _.map(myscope.vis.params.queryDefinitions, 'templateId'),
          _.map(myscope.vis.params.queryDefinitions, '_label'),
          _.map(myscope.vis.params.queryDefinitions, 'queryId'),
          myscope.holder.entityURI
        ];
      }, function () {
        if ($scope.vis && $scope.vis.params.queryDefinitions && $scope.vis.params.queryDefinitions.length) {
          $scope.renderTemplates();
        }
      }, true);

      var saveWithChangesHandler = function (diff) {
        if (diff.indexOf('entityDisabled') !== -1 || diff.indexOf('se') !== -1 || diff.indexOf('se_temp') !== -1) {
          if (configMode && globalState.se_temp && globalState.se_temp.length > 0) {
            $scope.holder.entityURI = globalState.se_temp[0];
          } else if (!configMode && globalState.se && globalState.se.length > 0) {
            $scope.holder.entityURI = globalState.se[0];
          } else {
            $scope.holder.entityURI = '';
          }
          $scope.renderTemplates();
        }
      };
      globalState.on('save_with_changes', saveWithChangesHandler);

      // when autoupdate is on we detect the refresh here
      var removeAutorefreshHandler = $rootScope.$on('courier:searchRefresh', function (event) {
        $scope.renderTemplates();
      });

      $scope.$on('$destroy', function () {
        removeAutorefreshHandler();
        globalState.off('save_with_changes', saveWithChangesHandler);
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
            selectedDocuments: [$scope.holder.entityURI]
          }
        ).then(function (resp) {
          $scope.holder.activeFetch = false;

          $scope.emptyResults = !resp.data.snippets || resp.data.snippets.length === 0;
          $scope.noSelectedDocument = resp.data.error === 'Empty selected document uri';

          if (resp.data.error && resp.data.error !== 'Empty selected document uri') {
            var msg  = '';
            if (typeof resp.data.error === 'string') {
              msg = resp.data.error;
            } else {
              msg = JSON.stringify(resp.data.error, null, '');
            }
            notify.warning(msg);
            return;
          }

          var emptyResultsTemplate = '';
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
            var emptyResultsMsgCounter = 0;
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

              var queryDefinition = _.find($scope.vis.params.queryDefinitions, function (queryDef) {
                return queryDef.queryId === snippet.data.config.id;
              });

              var dbFilter;
              if (queryDefinition.targetField && queryDefinition.targetField !== '' &&
                 queryDefinition.queryVariableName && queryDefinition.queryVariableName !== ''
              ) {
                dbFilter = {
                  meta: {
                    key: 'Relational Filter',
                    value: queryDefinition.queryId
                  },
                  dbfilter:{
                    queryid: queryDefinition.queryId,
                    queryVariableName: queryDefinition.queryVariableName,
                    path: queryDefinition.targetField
                  }
                };
                // add entity only if present - prevent errors when comparing 2 filters
                // as undefined value is not preserved in url it will get lost
                // and 2 dbfilters migth appear as different one

                // here depends that we are in configuration mode or not
                // use different selected entityURI
                if (configMode) {
                  dbFilter.dbfilter.entity = $scope.holder.entityURI;
                } else if (!configMode && globalState.se && globalState.se.length > 0) {
                  dbFilter.dbfilter.entity = globalState.se[0];
                }
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
});
