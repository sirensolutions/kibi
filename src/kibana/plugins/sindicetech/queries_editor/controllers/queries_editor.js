define(function (require) {

  require('css!plugins/sindicetech/queries_editor/styles/queries_editor.css');
  require('plugins/sindicetech/queries_editor/services/saved_queries/_saved_query');
  require('plugins/sindicetech/queries_editor/services/saved_queries/saved_queries');
  require('angular-sanitize');
  require('ng-tags-input');

  var _ = require('lodash');
  var angular = require('angular');

  require('routes')
  .when('/settings/queries', {
    template: require('text!plugins/sindicetech/queries_editor/index.html'),
    reloadOnSearch: false,
    resolve: {
      query: function (savedQueries) {
        return savedQueries.get();
      }
    }
  })
  .when('/settings/queries/:id?', {
    template: require('text!plugins/sindicetech/queries_editor/index.html'),
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


  var app = require('modules').get('apps/settings', ['kibana', 'ngSanitize', 'ngTagsInput']);

  app.controller(
    'QueriesEditor',
    function ($rootScope, $scope, $route, $window, kbnUrl, Notifier, queryEngineClient,
              savedDatasources, Private, $element
  ) {
      var _shouldEntityURIBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));
      var _set_entity_uri =  Private(require('plugins/kibi/commons/_set_entity_uri'));
      var queryHelper = Private(require('components/sindicetech/query_helper/query_helper'));

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

      _set_entity_uri($scope.holder);
      var off = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
        _set_entity_uri($scope.holder);
      });
      $scope.$on('$destroy', off);

      $scope.tabClick = function () {
        $scope.holder.jsonPreviewActive = !$scope.holder.jsonPreviewActive;
        $scope.holder.htmlPreviewActive = !$scope.holder.htmlPreviewActive;
      };

      var notify = new Notifier({
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

      var _enableEntityUri = function () {
        _shouldEntityURIBeEnabled(null, [$scope.query]).then(function (value) {
          $scope.holder.entityURIEnabled = value;
        }).catch(function (err) {
          notify.warning('Could not determine that widget need entityURI' + JSON.stringify(err, null, ' '));
        });
      };


      // for headers and params $watch with true as normal watch fail to detect the change in the arrays
      $scope.$watch('query.rest_headers', function () {
        _enableEntityUri();
      }, true);
      $scope.$watch('query.rest_params', function () {
        _enableEntityUri();
      }, true);

      $scope.$watchMulti(['query.st_activationQuery', 'query.st_resultQuery', 'query.rest_body'], function () {
        _enableEntityUri();
        if ($scope.datasourceType !== 'rest') {
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

            if (savedDatasource.datasourceType === 'rest') {
              $scope.query._previewTemplateId = 'kibi-json-jade';
            } else {
              $scope.query._previewTemplateId = 'kibi-table-jade';
            }
            $scope.preview();

          });
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
        $scope.query.id = $scope.query.title;
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

        if ($scope.query.id) {
          $scope.spinIt = true;
          return queryEngineClient.clearCache().then(function () {

            queryEngineClient.getQueriesHtmlFromServer(
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
              },
              true
            ).then(function (resp) {
              if (resp && resp.data && resp.data.error) {
                var msg = '';
                if (resp.data.error.message) {
                  msg = resp.data.error.message;
                } else if (resp.data.error && (typeof resp.data.error === 'string')) {
                  msg = resp.data.error;
                } else if (resp.data.error.error && (typeof resp.data.error.error === 'string')) {
                  msg = resp.data.error.error;
                } else {
                  msg = JSON.stringify(resp.data.error, null, ' ');
                }
                notify.warning(msg);
                $scope.holder.jsonPreview = JSON.stringify(resp.data.error, null, ' ');
                $scope.holder.jsonPreviewActive = true;
                $scope.holder.htmlPreviewActive = false;
                $scope.holder.htmlPreview = 'Error. For details look at the "Preview Json" tab.';

              } else if (resp && resp.data && resp.data.snippets && resp.data.snippets.length === 1) {
                $scope.holder.jsonPreview = JSON.stringify(resp.data.snippets[0], null, ' ');
                $scope.holder.htmlPreview = resp.data.snippets[0].html;
              }
              $scope.spinIt = false;
            });
          });

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
