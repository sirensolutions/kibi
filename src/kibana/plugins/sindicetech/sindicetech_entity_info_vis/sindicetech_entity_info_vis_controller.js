/*global alert:false */
define(function (require) {
  var module = require('modules').get('kibana/sindicetech_entity_info_vis', ['kibana']);
  var rison = require('utils/rison');
  var _ = require('lodash');
  var kibiUtils = require('kibiutils');

  module.controller(
    'SindicetechEntityInfoVisController',
    function ($rootScope, $scope, $window, $location, globalState, savedSearches, Private, queryEngineClient, Notifier) {

      var _shouldEntityURIBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));

      var notify = new Notifier({
        location: 'Templated Query Viewer'
      });

      var urlHelper = Private(require('components/kibi/url_helper/url_helper'));

      // generate random id to avoid collisions if there are multiple widgets on one dashboard
      $scope.snippetContainerId = kibiUtils.getUuid4();

      // we have to wrap the value into object - this prevents weird thing related to transclusion
      // see http://stackoverflow.com/questions/25180613/angularjs-transclusion-creates-new-scope
      $scope.holder = {
        entityURI: '',
        entityURIEnabled: false,
        visible: $location.path().indexOf('/visualize/edit/') === 0,
        html: '',
        htmlEvents:[]
      };

      if (globalState.se && globalState.se.length > 0 && globalState.entityDisabled === false) {
        $scope.holder.entityURI = globalState.se[0];
      } else {
        $scope.holder.entityURI = '';
      }

      var removeEntityURIEnabledHandler = $rootScope.$on('kibi:entityURIEnabled:entityinfo', function (event, entityURIEnabled) {
        $scope.holder.entityURIEnabled = entityURIEnabled;
      });

      var removeEntityURIChangedHandler = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
        $scope.holder.entityURI = se[0];
      });

      $scope.$watchMulti(['holder.entityURI', 'vis.params.queryOptions'], function () {
        if (!$scope.vis) return;

        if ($scope.vis.params.queryOptions) {
          $scope.renderTemplates();
        }
      });

      var save_with_changes_handler = function (diff) {
        if (diff.indexOf('entityDisabled') !== -1 || diff.indexOf('se') !== -1 ) {
          if (globalState.se && globalState.se.length > 0 && globalState.entityDisabled === false) {
            $scope.holder.entityURI = globalState.se[0];
          } else {
            $scope.holder.entityURI = '';
          }
          $scope.renderTemplates();
        }
      };
      globalState.on('save_with_changes', save_with_changes_handler);

      // when autoupdate is on we detect the refresh here
      var removeAutorefreshHandler = $rootScope.$on('kibi:autorefresh', function (event) {
        $scope.renderTemplates();
      });

      $scope.$on('$destroy', function () {
        removeEntityURIEnabledHandler();
        removeEntityURIChangedHandler();
        removeAutorefreshHandler();
        globalState.off('save_with_changes', save_with_changes_handler);
      });

      $scope.renderTemplates = function () {
        if ($scope.vis.params.queryOptions && $scope.vis.params.queryOptions.length === 0) {
          return;
        }

        $scope.holder.html = 'Loading ...';
        $scope.holder.activeFetch = true;

        queryEngineClient.getQueriesHtmlFromServer(
          $scope.vis.params.queryOptions,
          {
            selectedDocuments: [$scope.holder.entityURI]
          },
          true
        ).then(function (resp) {
          $scope.holder.activeFetch = false;
          $scope.emptyResults =  resp.data.snippets ? resp.data.snippets.length === 0 : true;
          $scope.noSelectedDocument = resp.data.error === 'Empty selected document uri';

          if (resp.data.error && resp.data.error !== 'Empty selected document uri' ) {
            var msg  = '';
            if (typeof resp.data.error === 'string') {
              msg = resp.data.error;
            } else {
              msg = JSON.stringify(resp.data.error, null, '');
            }
            notify.warning(msg);
            return;
          }

          var emptyResultsTemplate =
            '<div class="snippetContainer">' +
            '  <div class="snippet-@INDEX@">' +
            '    <div class="templateResult results-not-ok">' +
            '      <i class="fa fa-warning"></i>' +
            '        @MESSAGE@' +
            '    </div>' +
            '  </div>' +
            '</div>';

          if ($scope.emptyResults && !$scope.noSelectedDocument) {

            $scope.holder.html = 'No results';

          } else if ($scope.noSelectedDocument) {

            $scope.holder.activeFetch = false;
            $scope.holder.html = emptyResultsTemplate
            .replace(/@INDEX@/, 0)
            .replace(/@MESSAGE@/, 'No selected document, please select one');
            return;

          } else {

            $scope.holder.html = '';
            _.forEach(resp.data.snippets, function (snippet, index) {

              var label = String(index + 1) + ' id: [' + snippet.queryId + ']';

              if (snippet.queryActivated === false) {
                $scope.holder.activeFetch = false;
                $scope.holder.html += emptyResultsTemplate
                .replace(/@INDEX@/, 0)
                .replace(/@MESSAGE@/, 'Query ' + label + ' not activated, select another document or check activation rules');
                return;
              }

              if (typeof snippet.html === 'undefined') {
                $scope.holder.html += emptyResultsTemplate
                .replace(/@INDEX@/, 0)
                .replace(/@MESSAGE@/, 'No template set for query ' + label + ', please check view options');
                return;
              }

              var showFilterButton = false;
              if (snippet.data && snippet.data.ids && snippet.data.ids.length !== 0 &&
                 (snippet.data.config.showFilterButton === true || snippet.data.config.showFilterButton === 1)
              ) {
                showFilterButton = true;
              }
              /* NOTE: disabled experimental feature */
              showFilterButton = false;

              var queryOption = _.find($scope.vis.params.queryOptions, function (option) {
                return option.queryId === snippet.data.config.id;
              });

              var dbFilter;
              if (queryOption.targetField && queryOption.targetField !== '' &&
                 queryOption.queryVariableName && queryOption.queryVariableName !== ''
              ) {

                dbFilter = {
                  meta: {
                    key: 'Relational Filter',
                    value: queryOption.queryId
                  },
                  dbfilter:{
                    queryid: queryOption.queryId,
                    queryVariableName: queryOption.queryVariableName,
                    path: queryOption.targetField
                  }
                };
                // add entity only if present - prevent errors when comparing 2 filters
                // as undefined value is not preserved in url it will get lost
                // and 2 dbfilters migth appear as different one

                // here depends that we are in configuration mode or not
                // use different selected entityURI
                if ($scope.holder.visible) {
                  dbFilter.dbfilter.entity = $scope.holder.entityURI;
                } else if (!$scope.holder.visible && globalState.se && globalState.se.length > 0) {
                  dbFilter.dbfilter.entity = globalState.se[0];
                }
              }

              $scope.holder.html +=
                '<div class="snippetContainer">' +
                  '<div class="snippet-' + index + '">' +
                    '<div class="templateResult">' + snippet.html + '</div>' +
                    '<div class="filterButton" style="display:' + (showFilterButton === true ? 'block' : 'none') + '">' +
                      '<a class="filter" ng-click="holder.htmlEvents[' + index + '].filter()">' +
                        'Filter by "' + snippet.data.config.id + '"' +
                      '</a>' +
                      '<a ng-click="holder.htmlEvents[' + index + '].showQuery()"> <small>(show query)</small></a>' +
                    '</div>' +
                  '</div>' +
                '</div>';

              // here push events for each snippet
              $scope.holder.htmlEvents.push({
                showQuery: function () {
                  alert(snippet.data.debug.sentResultQuery);
                },
                filter: function () {
                  urlHelper.addFilter(dbFilter);
                  urlHelper.switchDashboard(queryOption.redirectToDashboard);
                }
              });
            });
          }

        }).catch(function (error) {
          notify.error(error);
        });

      };

    });
});
