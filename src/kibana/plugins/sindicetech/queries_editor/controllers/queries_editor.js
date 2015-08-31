define(function (require) {

  require('css!plugins/sindicetech/queries_editor/styles/queries_editor.css');
  require('plugins/sindicetech/queries_editor/services/saved_queries/_saved_query');
  require('plugins/sindicetech/queries_editor/services/saved_queries/saved_queries');
  require('angular-sanitize');
  require('ng-tags-input');

  var slugifyId = require('utils/slugify_id');
  var $ = require('jquery');
  var _ = require('lodash');

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
    function ($scope, config, globalState, $route, $window, kbnUrl, Notifier, queryEngineClient,
              savedVisualizations
  ) {

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

      if (globalState.entityURI && globalState.entityURI !== '') {
        $scope.holder.entityURI = globalState.entityURI;
      } else {
        $scope.holder.entityURI = '';
      }

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

      if (!$scope.query._previewTemplateId) {
        $scope.query._previewTemplateId = 'kibi-table-jade';
      }


      //TODO: use the module from commons here
      var _enableEntityUri = function () {
        var regex;
        if ($scope.datasourceType === 'rest') {
          regex = /@VAR[0-9]{1,}@/g;
          $scope.holder.entityURIEnabled =
            regex.test(JSON.stringify($scope.query.rest_headers)) ||
            regex.test(JSON.stringify($scope.query.rest_params));
        } else {
          regex = /@URI@|@TABLE@|@PKVALUE@/g;
          $scope.holder.entityURIEnabled = regex.test($scope.query.st_activationQuery) || regex.test($scope.query.st_resultQuery);
        }
      };

      $scope.$watch(['query.rest_headers', 'query.rest_params'], function () {
        _enableEntityUri();
      });

      $scope.$watchMulti(['query.st_activationQuery', 'query.st_resultQuery'], function () {
        _enableEntityUri();
        if ($scope.datasourceType !== 'rest') {
          var starRegex = /\*/g;
          // test for a star in a query
          $scope.starDetectedInAQuery = starRegex.test($scope.query.st_activationQuery) || starRegex.test($scope.query.st_resultQuery);
        }
      });

      $scope.$watch('query.st_datasourceId', function () {
        if ($scope.query.st_datasourceId) {
          $scope.datasourceType = null;
          _.each(config.file.datasources, function (datasource) {
            if (datasource.id === $scope.query.st_datasourceId) {
              $scope.datasourceType = datasource.type;

              _enableEntityUri();
              // if the datasource type == rest
              // init the rest_params and rest_headers arrays
              if (datasource.type === 'rest' && datasource.params) {
                _.each(datasource.params, function (param) {
                  if ( !_.find($scope.query.rest_params, function (p) { return p.name === param.name;})  ) {
                    $scope.query.rest_params.push(param);
                  }
                });
              }

              if (datasource.type === 'rest' && datasource.headers) {
                _.each(datasource.headers, function (header) {
                  if ( !_.find($scope.query.rest_headers, function (h) { return h.name === header.name;})  ) {
                    $scope.query.rest_headers.push(header);
                  }
                });
              }

              return false;
            }
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

      $scope.setEntityURI = function () {
        globalState.entityURI = $scope.holder.entityURI;
        globalState.save();
        $scope.submit();
      };

      $scope.editTemplate = function () {
        // TODO: try to do it without jquery
        var id = $('#selectTemplateId').val();
        kbnUrl.change('/templates_editor/' + id);
      };

      $scope.submit = function () {
        var idChanged = $scope.query.id !== $scope.query.title;
        $scope.query.id = $scope.query.title;
        $scope.query.save().then(function (resp) {
          // here flush the cache and refresh preview
          $scope.preview();
          notify.info('Query ' + $scope.query.title + ' successfuly saved');
          // here only if query.id changed !!!
          if (idChanged) {
            kbnUrl.change('settings/queries/' + slugifyId($scope.query.id));
          }
        });
      };

      $scope.delete = function () {
        // here check if this query is used in any visualisation
        savedVisualizations.find('').then(function (resp) {

          var vis = [];
          _.each(resp.hits, function (hit) {
            var s = JSON.stringify(hit);
            if (s.indexOf($scope.query.id) !== -1) {
              vis.push(hit.id);
            }
          });

          if (vis.length > 0 ) {
            $window.alert(
              'This query [' + $scope.query.title + '] is used in following' +
              (vis.length === 1 ? ' visualization' : ' visualizations') +
              ': \n' +
              vis.join('\n') +
              '\nPlease edit or delete' +
              (vis.length === 1 ? ' it ' : ' them ') +
              'first.' +
              '\n\n');
          } else {
            if ($window.confirm('Are you sure about deleting [' + $scope.query.title + '] ?')) {
              $scope.query.delete().then(function (resp) {
                kbnUrl.change('settings/queries', {});
              });
            }
          }

        });
      };

      $scope.jumpToTemplate = function () {
        kbnUrl.change('/settings/templates/' + $scope.query._previewTemplateId);
      };


      $scope.preview = function () {
        // here check that all required fields are in place before doing anything
        // there should be a validation which prevents submit if something is not right

        $scope.holder.jsonPreview = '';
        $scope.holder.htmlPreview = '';

        if ($scope.query.id) {

          queryEngineClient.clearCache().then(function () {

            queryEngineClient.getQueriesHtmlFromServer(
              $scope.holder.entityURI,
              null,
              null,
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

        $scope.query.save().then(function (resp) {
          // here flush the cache and refresh preview
          $scope.preview();
          notify.info('Query ' + $scope.query.title + 'successfuly saved');
          kbnUrl.change('settings/queries/' + slugifyId($scope.query.id));
        });
      };

      $scope.preview();
    });
});
