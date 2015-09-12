define(function (require) {

  var _ = require('lodash');

  require('modules')
    .get('kibana')
    .directive('stSelect', function (config, $http, courier, indexPatterns, savedSearches, savedQueries, savedDashboards, Private) {

      var sparqlHelper = Private(require('components/sindicetech/sparql_helper/sparql_helper'));
      var sqlHelper = Private(require('components/sindicetech/sql_helper/sql_helper'));
      var datasourceHelper = Private(require('components/sindicetech/datasource_helper/datasource_helper'));

      return {
        require: 'ngModel',
        restrict: 'E',
        replace: true,
        scope: {
          required:       '@',  // required property of the ng-select
          objectType:     '@',  // text
          savedSearchId:  '=?', // optional only for objectType === savedSearchFields
          indexPatternId: '=?', // optional only for objectType === field or objectType === indexPatternType
          queryId:        '=?', // optional only for objectType === queryVariable
          modelDisabled:  '=?'
        },
        template: require('text!directives/st_select.html'),
        link: function (scope, element, attrs, ngModelCtrl) {
          scope.modelObject = ngModelCtrl.$viewValue;
          scope.items = [];

          scope.$watch(attrs.ngModel, function () {
            scope.modelObject = ngModelCtrl.$viewValue;
          });

          scope.$watch('modelObject', function () {
            ngModelCtrl.$setViewValue(scope.modelObject);
          }, true);

          ngModelCtrl.$formatters.push(function (modelValue) {
            if (scope.items.length) {
              return _.find(scope.items, function (item) {
                return item.value === modelValue;
              });
            }
            return {
              value: modelValue,
              label: ''
            };
          });

          ngModelCtrl.$parsers.push(function (viewValue) {
            var ret = viewValue ? viewValue.value : null;
            ngModelCtrl.$setValidity('stSelect', scope.required ? !!ret : true);
            return ret;
          });

          var _renderSelect = function (items) {
            scope.analyzedField = false;
            scope.items = items;
            var item = _.find(scope.items, function (item) {
              return ngModelCtrl.$viewValue && item.value === ngModelCtrl.$viewValue.value;
            });
            if (item && item.options && item.options.analyzed) {
              scope.analyzedField = true;
            } else if (scope.items && scope.items.length > 0 && !item) {
              // object saved in the model is not in the list of items
              scope.modelObject = {
                value: '',
                label: ''
              };
            }
          };

          var _render = function () {
            if (scope.objectType === 'query') {
              $http.get('elasticsearch/' + config.file.kibana_index + '/' + scope.objectType + '/_search?size=100')
              .success(function (data) {
                if (data.hits.hits) {
                  var items = _.map(data.hits.hits, function (hit) {
                    return {
                      group: hit._source.st_tags.length ? hit._source.st_tags.join() : 'No tag',
                      label: hit._source.title,
                      value: hit._id
                    };
                  });
                  _renderSelect(items);
                }
              });
            } else if (scope.objectType === 'dashboard') {
              savedDashboards.find().then(function (data) {
                if (data.hits) {
                  var items = _.map(data.hits, function (hit) {
                    return {
                      label: hit.title,
                      value: hit.id
                    };
                  });
                  _renderSelect(items);
                }
              });
            } else if (scope.objectType === 'search' ||
                       scope.objectType === 'template') {
              $http.get('elasticsearch/' + config.file.kibana_index + '/' + scope.objectType + '/_search?size=100')
              .success(function (data) {
                if (data.hits.hits) {
                  var items = _.map(data.hits.hits, function (hit) {
                    return {
                      label: hit._source.title,
                      value: hit._id
                    };
                  });
                  _renderSelect(items);
                }
              });
            } else if (scope.objectType === 'datasource') {
              var datasources = _.map(config.file.datasources, function (datasource) {
                return {
                  label: datasource.id,
                  value: datasource.id
                };
              });
              _renderSelect(datasources);
            } else if (scope.objectType === 'indexPatternType') {

              if (!scope.indexPatternId) {
                return;
              }

              var indexPatternId = scope.indexPatternId;
              $http.get('elasticsearch/' + indexPatternId + '/_mappings')
              .success(function (response) {
                var types = [];
                for (var indexId in response) {
                  if (response[indexId].mappings) {
                    for (var type in response[indexId].mappings) {
                      if (response[indexId].mappings.hasOwnProperty(type)) {
                        types.push({
                          label: type,
                          value: type
                        });
                      }
                    }
                  }
                }
                if (types.length === 1) {
                  scope.modelObject = types[0];
                }

                _renderSelect(types);
              });

            } else if (scope.objectType === 'field') {
              var defId;
              if (scope.indexPatternId) {
                defId = scope.indexPatternId;
              } else {
                defId = config.get('defaultIndex');
              }

              indexPatterns.get(defId).then(function (index) {

                var fields = _.chain(index.fields)
                .filter(function (field) {
                  // filter some fields
                  return field.type !== 'boolean' && field.name && field.name.indexOf('_') !== 0;
                }).sortBy(function (field) {
                  return field.name;
                }).map(function (field) {
                  return {
                    label: field.name,
                    value: field.name,
                    options: {
                      analyzed: field.analyzed
                    }
                  };
                }).value();
                _renderSelect(fields);
              });
            } else if (scope.objectType === 'savedSearchFields' && scope.savedSearchId) {
              savedSearches.get(scope.savedSearchId).then(function (search) {
                var fields = _.map(search.columns, function (column) {
                  return {
                    label: column,
                    value: column
                  };
                });
                _renderSelect(fields);
              });
            } else if (scope.objectType === 'indexPattern') {
              courier.indexPatterns.getIds().then(function (ids) {
                var fields = _.map(ids, function (id) {
                  return {
                    label: id,
                    value: id
                  };
                });
                _renderSelect(fields);
              });
            } else if (scope.objectType === 'queryVariable') {
              if (scope.queryId && scope.queryId !== '') {

                // first fetch the query
                savedQueries.get(scope.queryId).then(function (savedQuery) {

                  var resultQuery = savedQuery.st_resultQuery;
                  // here check if it is sparql or sql
                  var datasourceType = datasourceHelper.getDatasourceType(savedQuery.st_datasourceId);
                  var variables = [];
                  if (datasourceType === 'sparql' || datasourceType === 'jdbc-sparql') {
                    variables = sparqlHelper.getVariables(resultQuery);
                  } else if (datasourceType === 'rest') {
                    // do nothing if variables is empty a text box instead of select should be rendered
                    variables = [];
                  } else {
                    // here must be a sql
                    variables = sqlHelper.getVariables(resultQuery);
                  }
                  scope.getVariable = false;
                  if (variables.length === 0 && datasourceType !== 'rest') { // either sparql or sql
                    scope.linkToQuery = '#/settings/queries/' + savedQuery.id;
                    scope.getVariable = true;
                  }

                  var fields = [];
                  _.each(variables, function (v) {
                    fields.push({
                      label: v.replace(',', ''),
                      value: v.replace('?', '').replace(',', '') // in case of sparql we have to remove the '?'
                    });
                  });

                  _renderSelect(fields);
                });
              }
            }

          };

          scope.$watchMulti(['savedSearchId', 'indexPatternId', 'queryId'], function () {
            _render();
          });

          _render();
        }

      };
    });
});
