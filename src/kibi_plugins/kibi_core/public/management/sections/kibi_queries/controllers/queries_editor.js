import 'plugins/kibi_core/management/sections/kibi_queries/styles/queries_editor.less';
import 'plugins/kibi_core/management/sections/kibi_queries/services/_saved_query';
import 'plugins/kibi_core/management/sections/kibi_queries/services/saved_queries';
import 'angular-sanitize';
import 'ng-tags-input';
import 'ui/kibi/components/query_engine_client/query_engine_client';
import 'ui/kibi/directives/kibi_dynamic_html';
import 'ui/kibi/directives/kibi_select';
import 'ui/kibi/directives/kibi_array_param';
import 'ui/kibi/directives/kibi_param_entity_uri';
import template from 'plugins/kibi_core/management/sections/kibi_queries/index.html';
import uiRoutes from 'ui/routes';
import uiModules from 'ui/modules';
import _ from 'lodash';
import angular from 'angular';
import kibiUtils from 'kibiutils';

uiRoutes
.when('/management/siren/queries', {
  template,
  reloadOnSearch: false,
  resolve: {
    query: function (savedQueries) {
      return savedQueries.get();
    }
  }
})
.when('/management/siren/queries/:id?', {
  template,
  reloadOnSearch: false,
  resolve: {
    query: function ($route, courier, savedQueries) {
      return savedQueries.get($route.current.params.id)
      .catch(courier.redirectWhenMissing({
        query: '/management/siren/queries'
      }));
    }
  }
});

function controller(kibiState, $scope, $route, kbnUrl, createNotifier, queryEngineClient, savedDatasources, $element, $routeParams,
  $timeout) {
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

  const notify = createNotifier({
    location: 'Queries Editor'
  });

  $scope.query = $route.current.locals.query;

  const _enableEntityUri = function () {
    $scope.holder.entityURIEnabled = kibiUtils.doesQueryDependOnEntity([ $scope.query ]);
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
      const starRegex = /\*/g;
      //used for remove lines between parenthesis or curly brackets
      //shouldn't detect subselect star which is between parenthesis or curly brackets
      const parenthesisOrCurlyBracketsRegex = /\([^\)]*\)|\{[^\)]*\}/g;
      let checkStarActivationQuery = false;
      let checkStarResultQuery = false;

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
            const header = _.find($scope.query.rest_headers, function (headerFromQuery) {
              return headerFromQuery.name === headerFromDatasource.name;
            });
            if (!header) {
              $scope.query.rest_headers.push(headerFromDatasource);
            }
          });

          _.each(savedDatasource.datasourceParams.params, function (paramFromDatasource) {
            const param = _.find($scope.query.rest_params, function (paramFromQuery) {
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

        $timeout(() => {
          $scope.$apply();
        });
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

  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.saveObject = function () {
    _enableEntityUri();
    return $scope.query.save()
    .then(function (savedQueryId) {
      notify.info(`Query ${$scope.query.title} successfuly saved`);
      if (savedQueryId !== $routeParams.id) {
        // redirect only if the query id changed !!!
        kbnUrl.change('management/siren/queries/{{id}}', { id: savedQueryId });
      } else {
        return $scope.preview();
      }
    });
  };

  $scope.jumpToTemplate = function () {
    kbnUrl.change('/management/siren/templates/' + $scope.preview.templateId);
  };

  $scope.jumpToDatasource = function () {
    kbnUrl.change('/management/siren/datasources/' + $scope.query.datasourceId);
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

  $scope.rejectTinkerpop = function (item) {
    return !!(item && item.type === 'tinkerpop3');
  };

  //TODO understand how the validation was done in object editor
  $scope.aceLoaded = function (editor) {
    return;
  };

  $scope.newObject = function () {
    kbnUrl.change('management/siren/queries', {});
  };

  $scope.$on('$destroy', function () {
    kibiState.removeTestEntityURI();
    kibiState.save();
  });

  $scope.preview();

  // expose some methods to the navbar buttons
  [ 'isValid', 'newObject', 'saveObject' ]
  .forEach(name => {
    $element.data(name, $scope[name]);
  });
}

uiModules
.get('apps/management', ['kibana', 'ngSanitize', 'ngTagsInput'])
.controller('QueriesEditor', controller);
