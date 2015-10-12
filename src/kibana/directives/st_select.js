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
          objectType:       '@',  // text
          indexPatternId:   '=?', // optional only for objectType === field | indexPatternType | documentIds
          indexPatternType: '=?', // optional only for objectType === documentIds
          queryId:          '=?', // optional only for objectType === queryVariable
          modelDisabled:    '=?', // use to disable the underlying select
          modelRequired:    '=?', // use to disable the underlying select
          extraItems:       '=?'  // extra values can be passed here
        },
        template: require('text!directives/st_select.html'),
        link: function (scope, element, attrs, ngModelCtrl) {
          scope.required = scope.modelRequired;
          scope.disabled = scope.modelDisabled;
          if (attrs.hasOwnProperty('required')) {
            scope.required = true;
          }
          scope.modelObject = ngModelCtrl.$viewValue; //object
          scope.items = [];

          scope.$watch(
            function () {
              return ngModelCtrl.$modelValue;
            },
            function (newValue) {
              scope.modelObject = ngModelCtrl.$viewValue; //object
            }
          );

          var _setViewValue = function () {
            if (scope.modelObject) {
              ngModelCtrl.$setViewValue(scope.modelObject);
            } else {
              ngModelCtrl.$setViewValue(null);
            }
          };

          scope.$watch('modelDisabled', function () {
            scope.disabled = scope.modelDisabled;
            if (scope.modelDisabled) {
              scope.required = false;
            }
            _setViewValue();
          });

          scope.$watch('modelRequired', function () {
            if (scope.modelRequired !== undefined) {
              scope.required = scope.modelRequired;
              _setViewValue();
            }
          });

          scope.$watch('modelObject', function () {
            _setViewValue();
          }, true);

          ngModelCtrl.$formatters.push(function (modelValue) {
            // here what is passed to a formatter is just a string
            var formatted;
            if (scope.items.length) {
              formatted = _.find(scope.items, function (item) {
                return item.value === modelValue;
              });
            }

            if (!formatted && modelValue) {
              formatted = {
                value: modelValue,
                label: ''
              };
            }
            return formatted;
          });

          ngModelCtrl.$parsers.push(function (viewValue) {
            var ret = viewValue ? viewValue.value : null;
            ngModelCtrl.$setValidity('stSelect', scope.required ? !!ret : true);
            return ret;
          });


          var _renderSelect = function (items) {
            scope.analyzedField = false;
            scope.items = items;
            if (scope.extraItems && scope.items) {
              scope.items = scope.extraItems.concat(scope.items);
            }

            if (!scope.required) {
              scope.items.splice(0, 0, {
                label: '',
                value: null
              });
            }

            var item = _.find(scope.items, function (item) {
              return ngModelCtrl.$viewValue && item.value === ngModelCtrl.$viewValue.value;
            });

            if (item && item.options && item.options.analyzed) {
              scope.analyzedField = true;
            } else if (scope.items && scope.items.length === 1) {
              // select automatically if only 1 option available
              scope.modelObject = scope.items[0];
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
                promise = selectHelper.getIndexTypes(scope.indexPatternId);
                break;
              case 'field':
                promise = selectHelper.getFields(scope.indexPatternId);
                break;
              case 'indexPattern':
                promise = selectHelper.getIndexesId();
                break;
              case 'documentIds':
                promise = selectHelper.getDocumentIds(scope.indexPatternId, scope.indexPatternType);
                break;
              case 'queryVariable':
                promise = selectHelper.getQueryVariables(scope.queryId);

                if (promise) {
                  promise = promise.then(function (data) {
                    scope.getVariable = false;
                    if (data.fields.length === 0 && data.datasourceType !== 'rest') { // either sparql or sql
                      scope.linkToQuery = '#/settings/queries/' + scope.queryId;
                      scope.getVariable = true;
                    }
                    return data.fields;
                  });
                }
                break;
            }

            scope.retrieveError = '';
            if (promise) {
              promise.then(_renderSelect).catch(function (err) {
                scope.retrieveError = _.isEmpty(err) ? '' : err;
                ngModelCtrl.$setValidity('stSelect', false);
              });
            }
          };

          scope.$watchMulti(['indexPatternId', 'indexPatternType', 'queryId', 'extraItems', 'modelDisabled', 'modelRequire'], function () {
            _render();
          });

          _render();
        }

      };
    });
});
