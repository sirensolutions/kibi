define(function (require) {

  var kibiUtils = require('kibiutils');
  var _ = require('lodash');
  var module = require('ui/modules').get('kibana');

  module.directive('kibiSelect', function (Private) {
    var selectHelper = Private(require('ui/kibi/directives/kibi_select_helper'));

    return {
      require: 'ngModel',
      restrict: 'E',
      replace: true,
      scope: {
        // the id of the kibi-select object
        id: '=?',
        // Filter function which returns true for items to be removed.
        // There are two arguments:
        // - id: the id of the kibi-select
        // - item: the item
        // Since the filter function is called with arguments, a function named "myfunc" should be passed
        // as 'filter="myfunc"'.
        // See http://weblogs.asp.net/dwahlin/creating-custom-angularjs-directives-part-3-isolate-scope-and-function-parameters
        //
        // If the item is **undefined**, the function may return an object that is used in the angular watcher.
        filter: '&?',
        filterOptions: '=?', // optional options map eg: { param: value }
        objectType: '@',  // text
        indexPatternId: '=?', // optional only for objectType === field | indexPatternType | documentIds
        indexPatternType: '=?', // optional only for objectType === documentIds
        fieldTypes: '=?', // optional only for objectType === field, value should be array of strings
        queryId: '=?', // optional only for objectType === queryVariable
        modelDisabled: '=?', // use to disable the underlying select
        modelRequired: '=?', // use to disable the underlying select
        include: '=?', // extra values can be passed here
        analyzedWarning: '@'   // set to true or false to disable/enable analyzed field warning
      },
      template: require('ui/kibi/directives/kibi_select.html'),
      controller: function () {
        // One can use a decorator and override this method to add custom object types to the kibi-select
        this.extendedObjectType = function (scope) {};
      },
      link: function (scope, element, attrs, ngModelCtrl) {
        scope.required = Boolean(scope.modelRequired);
        scope.disabled = Boolean(scope.modelDisabled);
        if (attrs.hasOwnProperty('required')) {
          scope.required = true;
        }
        scope.items = [];

        scope.isInvalid = function () {
          return ngModelCtrl.$invalid;
        };

        function setModelObject() {
          scope.modelObject = ngModelCtrl.$viewValue; //object
          if (scope.modelObject) {
            if (_.get(scope, 'modelObject.value.id')) {
              scope.modelObject.id = scope.modelObject.value.id;
            } else {
              scope.modelObject.id = scope.modelObject.value;
            }
          }
        }

        scope.$watch(
          function () {
            return ngModelCtrl.$modelValue;
          },
          setModelObject.bind(this)
        );
        setModelObject();

        var _setViewValue = function (modelObject) {
          if (modelObject) {
            ngModelCtrl.$setViewValue(modelObject);
          } else {
            ngModelCtrl.$setViewValue(null);
          }
        };

        scope.$watch('modelDisabled', function (newValue, oldValue, myScope) {
          if (newValue !== undefined) {
            myScope.disabled = newValue;
            myScope.required = !newValue;
            _setViewValue(myScope.modelObject);
          }
        });

        scope.$watch('modelRequired', function (newValue, oldValue, myScope) {
          if (newValue !== undefined) {
            myScope.required = newValue;
            _setViewValue(myScope.modelObject);
          }
        });

        scope.$watch('modelObject', function (newValue, oldValue, myScope) {
          if (newValue !== undefined) {
            _setViewValue(newValue);
          }
        }, true);

        ngModelCtrl.$formatters.push(function (modelValue) {
          // here what is passed to a formatter is just a string
          var formatted;
          if (scope.items.length) {
            formatted = _.find(scope.items, function (item) {
              return _.isEqual(item.value, modelValue);
            });
          } else if (scope.include && scope.include.length) {
            formatted = _.find(scope.include, function (item) {
              return _.isEqual(item.value, modelValue);
            });
          }

          if (!formatted && modelValue) {
            formatted = {
              id: modelValue,
              value: modelValue,
              label: ''
            };
          }
          return formatted;
        });

        ngModelCtrl.$parsers.push(function (viewValue) {
          return viewValue ? viewValue.value : null;
        });

        ngModelCtrl.$validators.validValue = function (modelValue, viewValue) {
          return scope.required ? Boolean(modelValue) : true;
        };

        ngModelCtrl.$validators.retrieveError = function (modelValue, viewValue) {
          return !scope.retrieveError;
        };

        function autoSelect(items) {
          if (scope.required) {
            return items.length === 1;
          }
          return false;
        }

        var _renderSelect = function (scope, items) {
          scope.analyzedField = false;
          scope.items = items;
          if (scope.items) {
            if (scope.include && scope.include.length) {
              // remove elements in items that appear in the extra items
              _.remove(scope.items, function (item) {
                return !!_.find(scope.include, function (extraItem) {
                  return _.isEqual(item.value, extraItem.value);
                });
              });
              scope.items.push(...scope.include);
            }

            if (scope.filter && _.isFunction(scope.filter())) {
              _.remove(scope.items, function (item) {
                var selected = !!ngModelCtrl.$viewValue && !!ngModelCtrl.$viewValue.value &&
                  _.isEqual(ngModelCtrl.$viewValue.value, item.value);

                var toRemove = scope.filter()(scope.id, item, scope.filterOptions);

                return toRemove && !selected;
              });
            }
          }

          var item = _.find(scope.items, function (item) {
            return ngModelCtrl.$viewValue && _.isEqual(item.value, ngModelCtrl.$viewValue.value);
          });

          if (item && item.options && item.options.analyzed) {
            scope.analyzedField = true;
          } else if (autoSelect(scope.items)) {
            // select automatically if only 1 option is available and the select is required
            scope.modelObject = scope.items[0];
            scope.analyzedField = _.get(scope.items[0], 'options.analyzed');
          } else if (scope.items && scope.items.length > 0 && !item) {
            // object saved in the model is not in the list of items
            scope.modelObject = {
              value: '',
              id: '',
              label: ''
            };
          }
        };

        var _render = function (scope) {
          let promise;

          // if disabled, do not try to render anything
          if (scope.disabled) {
            return;
          }
          if (ngModelCtrl.extendedObjectType) {
            promise = ngModelCtrl.extendedObjectType(scope);
          }

          if (!promise) {
            switch (scope.objectType) {
              case 'query':
                promise = selectHelper.getQueries();
                break;
              case 'dashboard':
                promise = selectHelper.getDashboards();
                break;
              case 'search':
                promise = selectHelper.getSavedSearches();
                break;
              case 'template':
                promise = selectHelper.getTemplates();
                break;
              case 'datasource':
                promise = selectHelper.getDatasources();
                break;
              case 'indexPatternType':
                promise = selectHelper.getIndexTypes(scope.indexPatternId);
                break;
              case 'field':
                promise = selectHelper.getFields(scope.indexPatternId, scope.fieldTypes);
                break;
              case 'indexPattern':
                promise = selectHelper.getIndexesId();
                break;
              case 'documentIds':
                promise = selectHelper.getDocumentIds(scope.indexPatternId, scope.indexPatternType);
                break;
              case 'joinRelations':
                promise = selectHelper.getJoinRelations();
                break;
              case 'queryVariable':
                promise = selectHelper.getQueryVariables(scope.queryId);

                if (promise) {
                  promise = promise.then(function (data) {
                    scope.getVariable = false;
                    if (data.fields.length === 0 && data.datasourceType !== kibiUtils.DatasourceTypes.rest) { // either sparql or sql
                      scope.linkToQuery = '#/settings/queries/' + scope.queryId;
                      scope.getVariable = true;
                    }
                    return data.fields;
                  });
                }
                break;
              case 'iconType':
                promise = selectHelper.getIconType();
                break;
              case 'labelType':
                promise = selectHelper.getLabelType();
                break;
            }
          }

          scope.retrieveError = '';
          if (promise) {
            promise.then(_renderSelect.bind(this, scope)).catch(function (err) {
              scope.retrieveError = err.message;
            });
          }
        };

        scope.$watchMulti(['indexPatternId', 'indexPatternType', 'queryId', 'include', 'modelDisabled', 'modelRequired'], function () {
          _render(scope);
        });

        scope.$watch(function (scope) {
          if (scope.filter && _.isFunction(scope.filter())) {
            return scope.filter()(scope.id);
          }
        }, function (newValue, oldValue, scope) {
          _render(scope);
        }, true);

        // init
        _render(scope);
      }

    };
  });
});
