define(function (require) {


  require('plugins/kibana/settings/sections/kibi_queries/styles/queries_editor.less');
  require('plugins/kibana/settings/sections/kibi_queries/services/_saved_query');
  require('plugins/kibana/settings/sections/kibi_queries/services/saved_queries');
  require('angular-sanitize');
  require('ng-tags-input');

  require('ui/kibi/components/query_engine_client/query_engine_client');

  require('ui/kibi/directives/kibi_dynamic_html');
  require('ui/kibi/directives/kibi_select');
  require('ui/kibi/directives/kibi_array_param');
  require('ui/kibi/directives/kibi_param_entity_uri');

  var _ = require('lodash');
  var angular = require('angular');
  var kibiUtils = require('kibiutils');

  require('ui/routes')
  .when('/settings/queries', {
    template: require('plugins/kibana/settings/sections/kibi_queries/index.html'),
    reloadOnSearch: false,
    resolve: {
      query: function (savedQueries) {
        return savedQueries.get();
      }
    }
  })
  .when('/settings/queries/:id?', {
    template: require('plugins/kibana/settings/sections/kibi_queries/index.html'),
    reloadOnSearch: false,
    resolve: {
      query: function ($route, courier, savedQueries) {
        return savedQueries.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'query' : '/settings/queries'
        }));
      }
    }
  });


  var app = require('ui/modules').get('apps/settings', ['kibana', 'ngSanitize', 'ngTagsInput']);

  app.controller(
    'QueriesEditor',
    function (kibiState, $scope, $route, $window, kbnUrl, createNotifier, queryEngineClient, savedDatasources, $element) {
      var doesQueryDependOnEntity = require('kibiutils').doesQueryDependOnEntity;

      $scope.isJDBC = kibiUtils.isJDBC;
      $scope.isSPARQL = kibiUtils.isSPARQL;
      $scope.isSQL = kibiUtils.isSQL;
      $scope.DatasourceTypes = kibiUtils.DatasourceTypes;
      $scope.preview = {
        templateId: 'kibi-table-jade'
      };

      // we have to wrap the value into object - this prevents weird thing related to transclusion
      // see http://stackoverflow.com/questions/25180613/angularjs-transclusion-creates-new-scope
      $scope.holder = {
        entityURIEnabled: false,
        visible: true,
        jsonPreviewActive: false,
        htmlPreviewActive: true,
        jsonPreview: null
      };
      $scope.starDetectedInAQuery = false;

      $scope.tabClick = function (preview) {
        switch (preview) {
          case 'json':
            $scope.holder.jsonPreviewActive = true;
            $scope.holder.htmlPreviewActive = false;
            break;
          case 'html':
            $scope.holder.jsonPreviewActive = false;
            $scope.holder.htmlPreviewActive = true;
            break;
        }
      };

      var notify = createNotifier({
        location: 'Queries Editor'
      });

      $scope.snippetFinderOpen = false;
      $scope.openQueryFinder = function () {
        $scope.queryFinderOpen = true;
      };
      $scope.closeQueryFinder = function (hit, event) {
        $scope.queryFinderOpen = false;
        kbnUrl.change('settings/queries/' + hit.id);
      };

      $scope.query = $route.current.locals.query;
      $scope.$queryTitle = $route.current.locals.query.title;

      const _enableEntityUri = function () {
        $scope.holder.entityURIEnabled = doesQueryDependOnEntity([ $scope.query ]);
      };
      _enableEntityUri();

      $scope.$listen(kibiState, 'save_with_changes', function (diff) {
        if (diff.indexOf(kibiState._properties.test_selected_entity) !== -1 && $scope.holder.entityURIEnabled) {
          $scope.preview();
        }
      });

      $scope.$watch('preview.templateId', function (templateId) {
        if (templateId) {
          $scope.preview.templateId = templateId;
          $scope.preview();
        }
      });

      // for headers and params $watch with true as normal watch fail to detect the change in the arrays
      $scope.$watch('query.rest_headers', function () {
        _enableEntityUri();
      }, true);
      $scope.$watch('query.rest_params', function () {
        _enableEntityUri();
      }, true);
      $scope.$watch('query.rest_path', function () {
        _enableEntityUri();
      });

      $scope.$watchMulti(['query.activationQuery', 'query.resultQuery', 'query.rest_body'], function () {
        _enableEntityUri();
        if ($scope.datasourceType !== kibiUtils.DatasourceTypes.rest) {
          var starRegex = /\*/g;
          //used for remove lines between parenthesis or curly brackets
          //shouldn't detect subselect star which is between parenthesis or curly brackets
          var parenthesisOrCurlyBracketsRegex = /\([^\)]*\)|\{[^\)]*\}/g;
          var checkStarActivationQuery = false;
          var checkStarResultQuery = false;

          if ($scope.query.activationQuery) {
            checkStarActivationQuery = starRegex.test($scope.query.activationQuery.replace(parenthesisOrCurlyBracketsRegex, ''));
          }
          if ($scope.query.resultQuery) {
            checkStarResultQuery = starRegex.test($scope.query.resultQuery.replace(parenthesisOrCurlyBracketsRegex, ''));
          }
          // test for a star in a query
          // TODO why test activationQuery ?
          $scope.starDetectedInAQuery = checkStarActivationQuery || checkStarResultQuery;
        }
      });

      $scope.$watch('query.datasourceId', function () {
        if ($scope.query.datasourceId) {
          $scope.datasourceType = null;

          // now check the datasourceType
          savedDatasources.get($scope.query.datasourceId).then(function (savedDatasource) {
            $scope.datasourceType = savedDatasource.datasourceType;

            if (savedDatasource.datasourceParams) {
              _.each(savedDatasource.datasourceParams.headers, function (headerFromDatasource) {
                var header = _.find($scope.query.rest_headers, function (headerFromQuery) {
                  return headerFromQuery.name === headerFromDatasource.name;
                });
                if (!header) {
                  $scope.query.rest_headers.push(headerFromDatasource);
                }
              });

              _.each(savedDatasource.datasourceParams.params, function (paramFromDatasource) {
                var param = _.find($scope.query.rest_params, function (paramFromQuery) {
                  return paramFromQuery.name === paramFromDatasource.name;
                });
                if (!param) {
                  $scope.query.rest_params.push(paramFromDatasource);
                }
              });
            }

            _enableEntityUri();

            if (savedDatasource.datasourceType === kibiUtils.DatasourceTypes.rest) {
              $scope.preview.templateId = 'kibi-json-jade';
            } else {
              $scope.preview.templateId = 'kibi-table-jade';
            }
            return $scope.preview();
          }).catch(notify.error);
        }
      }, true);


      // here we have to translate back and forth between tags array from query object
      // and array of tag objects required by tag widget
      $scope.tags = _.map($scope.query.tags, function (tag) {
        return {
          text: tag
        };
      });

      $scope.$watch('tags', function (tags) {
        $scope.query.tags = _.map(tags, function (tag) {
          return tag.text;
        });
        $scope.query.tags.sort();
      }, true);

      $scope.submit = function () {
        if (!$element.find('form[name="objectForm"]').hasClass('ng-valid')) {
          $window.alert('Please fill in all the required parameters.');
          return;
        }
        var titleChanged = $scope.$queryTitle !== $scope.query.title;
        $scope.query.id = $scope.query.title;
        _enableEntityUri();
        return $scope.query.save().then(function (savedQueryId) {
          notify.info('Query ' + $scope.query.title + ' successfuly saved');
          if (titleChanged) {
            // redirect only if query.id changed !!!
            kbnUrl.change('settings/queries/' + savedQueryId);
          } else {
            return $scope.preview();
          }
        });
      };

      $scope.jumpToTemplate = function () {
        kbnUrl.change('/settings/templates/' + $scope.preview.templateId);
      };

      $scope.jumpToDatasource = function () {
        kbnUrl.change('/settings/datasources/' + $scope.query.datasourceId);
      };

      $scope.preview = function () {
        // here check that all required fields are in place before doing anything
        // there should be a validation which prevents submit if something is not right

        $scope.holder.jsonPreview = '';
        $scope.holder.htmlPreview = '';

        const entity = kibiState.getEntityURI();
        if ($scope.query.id && (!$scope.holder.entityURIEnabled || entity)) {
          $scope.spinIt = true;
          return queryEngineClient.clearCache().then(function () {
            return queryEngineClient.getQueriesHtmlFromServer(
              [
                {
                  open: true,
                  queryId: $scope.query.id,
                  templateId: $scope.preview.templateId,
                  templateVars: {
                    label: 'Preview'
                  }
                }
              ],
              {
                selectedDocuments: kibiState.isSelectedEntityDisabled() ? [] : [ entity ],
                verbose: true
              }
            );
          }).then(function (resp) {
            if (resp && resp.data && resp.data.error) {
              notify.warning(resp.data.error);
              $scope.holder.jsonPreview = JSON.stringify(resp.data.error, null, ' ');
              $scope.holder.jsonPreviewActive = true;
              $scope.holder.htmlPreviewActive = false;
              $scope.holder.htmlPreview = 'Error. For details look at the "Preview Json" tab.';

            } else if (resp && resp.data && resp.data.snippets && resp.data.snippets.length === 1) {
              $scope.holder.jsonPreview = JSON.stringify(resp.data.snippets[0], null, ' ');
              $scope.holder.htmlPreview = resp.data.snippets[0].html;
            }
            $scope.spinIt = false;
          }).catch(notify.error);
        }
      };

      //TODO understand how the validation was done in object editor
      $scope.aceLoaded = function (editor) {
        return;
      };

      $scope.newQuery = function () {
        kbnUrl.change('settings/queries', {});
      };

      $scope.$on('$destroy', function () {
        kibiState.removeTestEntityURI();
        kibiState.save();
      });

      $scope.preview();
    });
});
