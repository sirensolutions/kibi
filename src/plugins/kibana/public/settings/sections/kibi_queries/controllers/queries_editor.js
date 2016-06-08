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
    function ($rootScope, $scope, $route, $window, kbnUrl, createNotifier, queryEngineClient,
              savedDatasources, Private, $element) {

      var queryHelper = Private(require('ui/kibi/helpers/query_helper'));
      var setEntityUri = Private(require('ui/kibi/components/commons/_set_entity_uri'));
      var doesQueryDependsOnEntity = Private(require('ui/kibi/components/commons/_does_query_depends_on_entity'));

      $scope.isJDBC = kibiUtils.isJDBC;
      $scope.isSPARQL = kibiUtils.isSPARQL;
      $scope.isSQL = kibiUtils.isSQL;
      $scope.DatasourceTypes = kibiUtils.DatasourceTypes;

      // we have to wrap the value into object - this prevents weird thing related to transclusion
      // see http://stackoverflow.com/questions/25180613/angularjs-transclusion-creates-new-scope
      $scope.holder = {
        entityURI: '',
        entityURIEnabled: false,
        visible: true,
        jsonPreviewActive: false,
        htmlPreviewActive: true,
        jsonPreview: null
      };
      $scope.starDetectedInAQuery = false;

      setEntityUri($scope.holder);
      var off = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
        setEntityUri($scope.holder);
      });
      $scope.$on('$destroy', off);

      $scope.tabClick = function () {
        $scope.holder.jsonPreviewActive = !$scope.holder.jsonPreviewActive;
        $scope.holder.htmlPreviewActive = !$scope.holder.htmlPreviewActive;
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

      if (!$scope.query._previewTemplateId) {
        $scope.query._previewTemplateId = 'kibi-table-jade';
      }

      const _enableEntityUri = function () {
        $scope.holder.entityURIEnabled = false;
        if ($scope.query.id && $scope.query.id.charAt(0) === '1') {
          $scope.holder.entityURIEnabled = true;
        }
      };
      _enableEntityUri();

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

      $scope.$watchMulti(['query.st_activationQuery', 'query.st_resultQuery', 'query.rest_body'], function () {
        _enableEntityUri();
        if ($scope.datasourceType !== kibiUtils.DatasourceTypes.rest) {
          var starRegex = /\*/g;
          // test for a star in a query
          // TODO why test st_activationQuery ?
          $scope.starDetectedInAQuery = starRegex.test($scope.query.st_activationQuery) || starRegex.test($scope.query.st_resultQuery);
        }
      });

      $scope.$watch('query.st_datasourceId', function () {
        if ($scope.query.st_datasourceId) {
          $scope.datasourceType = null;

          // now check the datasourceType
          savedDatasources.get($scope.query.st_datasourceId).then(function (savedDatasource) {
            $scope.datasourceType = savedDatasource.datasourceType;

            _enableEntityUri();
            if (savedDatasource.datasourceType === kibiUtils.DatasourceTypes.rest) {
              $scope.query._previewTemplateId = 'kibi-json-jade';
            } else {
              $scope.query._previewTemplateId = 'kibi-table-jade';
            }
            return $scope.preview();
          }).catch(notify.error);
        }
      }, true);


      // here we have to translate back and forth between tags array from query object
      // and array of tag objects required by tag widget
      $scope.tags = _.map($scope.query.st_tags, function (tag) {
        return {
          text: tag
        };
      });

      $scope.$watch('tags', function (tags) {
        $scope.query.st_tags = _.map(tags, function (tag) {
          return tag.text;
        });
        $scope.query.st_tags.sort();
      }, true);

      $scope.submit = function () {
        if (!$element.find('form[name="objectForm"]').hasClass('ng-valid')) {
          $window.alert('Please fill in all the required parameters.');
          return;
        }
        var titleChanged = $scope.$queryTitle !== $scope.query.title;
        if (doesQueryDependsOnEntity([ $scope.query ])) {
          $scope.holder.entityURIEnabled = true;
          $scope.query.id = '1' + $scope.query.title;
        } else {
          $scope.holder.entityURIEnabled = false;
          $scope.query.id = '0' + $scope.query.title;
        }
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

      $scope.delete = function () {
        if (!$scope.query.id) {
          notify.error('The query [' + $scope.query.title + '] does not have an ID');
          return;
        }

        // here check if this query is used in any visualisation
        return queryHelper.getVisualisations([ $scope.query.id ]).then(function (visData) {
          var vis = visData[1];
          if (vis.length) {
            $window.alert(
              'This query [' + $scope.query.title + '] is used in the following' +
              (vis.length === 1 ? ' visualization' : ' visualizations') + ': \n' +
              JSON.stringify(_.pluck(vis, 'title'), null, ' ') +
              '\n\nPlease edit or delete' + (vis.length === 1 ? ' it ' : ' them ') + 'first.\n\n'
            );
          } else {
            if ($window.confirm('Are you sure about deleting [' + $scope.query.title + '] ?')) {
              return $scope.query.delete().then(function (resp) {
                kbnUrl.change('settings/queries', {});
              });
            }
          }
        });
      };

      $scope.jumpToTemplate = function () {
        kbnUrl.change('/settings/templates/' + $scope.query._previewTemplateId);
      };

      $scope.jumpToDatasource = function () {
        kbnUrl.change('/settings/datasources/' + $scope.query.st_datasourceId);
      };

      $scope.preview = function () {
        // here check that all required fields are in place before doing anything
        // there should be a validation which prevents submit if something is not right

        $scope.holder.jsonPreview = '';
        $scope.holder.htmlPreview = '';

        if ($scope.query.id && (!$scope.holder.entityURIEnabled || $scope.holder.entityURI)) {
          $scope.spinIt = true;
          return queryEngineClient.clearCache().then(function () {
            return queryEngineClient.getQueriesHtmlFromServer(
              [
                {
                  open: true,
                  queryId: $scope.query.id,
                  showFilterButton: false,
                  // this is one of ours default templates and should always be loaded when queryEngine starts
                  templateId: $scope.query._previewTemplateId,
                  templateVars: {
                    label: 'Preview'
                  }
                }
              ],
              {
                selectedDocuments: [$scope.holder.entityURI]
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

      $scope.clone = function () {
        $scope.query.id = $scope.query.title + '-clone';
        $scope.query.title = $scope.query.title + ' clone';

        $scope.query.save().then(function (savedQueryid) {
          $scope.preview();
          notify.info('Query ' + $scope.query.title + 'successfuly saved');
          kbnUrl.change('settings/queries/' + savedQueryid);
        });
      };

      $scope.preview();
    });
});
