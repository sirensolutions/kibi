define(function (require) {

  var _ = require('lodash');

  require('modules')
    .get('kibana')
    .directive('stSelect', function (Private) {
      var selectHelper = Private(require('directives/st_select_helper'));

      return {
        require: 'ngModel',
        restrict: 'E',
        replace: true,
        scope: {
          required:       '@',  // required property of the ng-select
          objectType:     '@',  // text
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
            var promise;

            switch (scope.objectType) {
              case 'query':
                promise = selectHelper.getQueries();
                break;
              case 'dashboard':
                promise = selectHelper.getDashboards();
                break;
              case 'search':
              case 'template':
                promise = selectHelper.getObjects(scope.objectType);
                break;
              case 'datasource':
                promise = selectHelper.getDatasources();
                break;
              case 'indexPatternType':
                var getTypes = selectHelper.getIndexTypes(scope.indexPatternId);

                if (getTypes) {
                  getTypes.then(function (types) {
                    if (types) {
                      if (types.length === 1) {
                        scope.modelObject = types[0];
                      }
                      _renderSelect(types);
                    }
                  });
                }
                break;
              case 'field':
                promise = selectHelper.getFields(scope.indexPatternId);
                break;
              case 'indexPattern':
                promise = selectHelper.getIndexesId();
                break;
              case 'queryVariable':
                var getVariables = selectHelper.getQueryVariables(scope.queryId);

                if (getVariables) {
                  getVariables.then(function (data) {
                    var variables = data[0];
                    var datasourceType = data[1];

                    scope.getVariable = false;
                    if (variables.length === 0 && datasourceType !== 'rest') { // either sparql or sql
                      scope.linkToQuery = '#/settings/queries/' + scope.queryId;
                      scope.getVariable = true;
                    }
                    _renderSelect(variables);
                  });
                }
                break;
            }

            if (promise) {
              promise.then(_renderSelect);
            }
          };

          scope.$watchMulti(['indexPatternId', 'queryId'], function () {
            _render();
          });

          _render();
        }

      };
    });
});
