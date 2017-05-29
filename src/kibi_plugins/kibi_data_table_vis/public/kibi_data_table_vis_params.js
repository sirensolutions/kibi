import _ from 'lodash';
import 'ui/kibi/directives/kibi_select';
import 'ui/kibi/directives/kibi_array_param';
import uiModules from 'ui/modules';
import template from 'plugins/kibi_data_table_vis/kibi_data_table_vis_params.html';

uiModules
.get('kibana/kibi_data_table_vis')
.directive('kibiDataTableVisParams', function (savedDatasources, $rootScope, $route, createNotifier, $window, kbnUrl) {
  const notify = createNotifier({
    location: 'Enhanced search results'
  });

  return {
    restrict: 'E',
    template,
    link: function ($scope) {

      // ======
      // Events
      // ======

      // Emit an event when state changes
      $scope.$watch('vis.dirty', function () {
        if ($scope.vis.dirty === false) {
          $rootScope.$emit('kibi:vis:state-changed');
        }
      });

      $scope.jumpToTemplate = function () {
        kbnUrl.change('/settings/templates/' + $scope.vis.params.templateId);
      };

      $scope.filterTemplates = function (item) {
        return item ? item.templateEngine !== 'html-angular' : true;
      };

      // ====================================
      // Visualization controller integration
      // ====================================

      // check if there is any click actions / relational column definition
      // before removing a column of the table
      const removeRemoveColumnHandler = $rootScope.$on('kibi:remove:column', function (event, column) {
        if (column) {
          let msg;

          if ($scope.vis.params.enableQueryFields && column.fieldName === $scope.vis.params.queryFieldName) {
            msg = 'Are you sure you want to remove the relational column "' +
            column.fieldName + '" ?';
            if ($window.confirm(msg)) {
              $scope.vis.params.enableQueryFields = false;
            } else {
              $rootScope.$emit('kibi:add:column', column);
            }
            return;
          }

          let clicks = 0;
          _.each($scope.vis.params.clickOptions, function (clickOption) {
            if (clickOption.columnField === column.fieldName) {
              clicks++;
            }
          });
          if (clicks > 0) {
            msg = 'There ' + (clicks === 1 ? 'is 1' : 'are ' + clicks) +
              ' click actions configured with the ' + column.fieldName + ' column. Are you sure to remove it ?';
            if ($window.confirm(msg)) {
              _.remove($scope.vis.params.clickOptions, function (clickOption) {
                return clickOption.columnField === column.fieldName;
              });
            } else {
              // add the column back
              $rootScope.$emit('kibi:add:column', column);
            }
          }
        }
      });

      // Point savedObject.columns to vis.params.columns
      const removeSavedObjectColumnsChangedHandler = $rootScope.$on('kibi:vis:savedObjectColumns-changed',
        function (event, savedObject) {
          if (savedObject && savedObject.columns !== $scope.vis.params.columns) {
            fillColumnAliases();
            savedObject.columns = $scope.vis.params.columns;
          }
        }
      );

      $scope.$on('$destroy', function () {
        removeRemoveColumnHandler();
        removeSavedObjectColumnsChangedHandler();
      });

      // Need to emit an event to update table columns while visualization is dirty
      $scope.$watch('vis.params.columns', columns => {
        if (columns) {
          fillColumnAliases();
          $rootScope.$emit('kibi:vis:columns-changed', columns);
        }
      }, true);

      $scope.columnAliasesValidation = function () {
        $scope.columnAliasesValid = true;

        _.each($scope.vis.params.columnAliases, function (alias, index) {
          $scope.aliasValidStatus[index] = true;
          for(let i = 0; i < $scope.vis.params.columnAliases.length; i++) {
            if (index !== i && alias !== '' && $scope.vis.params.columnAliases[i] === alias) {
              $scope.aliasValidStatus[index] = false;
              $scope.columnAliasesValid = '';
            }
          }
        });
      };

      function fillColumnAliases() {
        // prepopulate aliases to original names if not defined
        _.each($scope.vis.params.columns, (columnName, index) => {
          if (!$scope.vis.params.columnAliases[index]) {
            $scope.vis.params.columnAliases[index] = columnName;
          }
        });
      }

      $scope.$watch('vis.params.templateId', function (templateId) {
        $rootScope.$emit('kibi:vis:templateId-changed', templateId);
      }, true);

      $scope.$watch('vis.params.enableColumnAliases', (enableColumnAliases) => {
        if (!enableColumnAliases) {
          $scope.vis.params.columnAliases = [];
        } else {
          fillColumnAliases();

          // status array of aliases initialized true
          $scope.aliasValidStatus = new Array($scope.vis.params.columnAliases.length).fill(true);
          $scope.columnAliasesValid = true;
        }
        $rootScope.$emit('kibi:vis:columnAliases-changed', $scope.vis.params.columnAliases);
      }, true);

      // =======
      // Queries
      // =======

      let previousName = null;
      $scope.$watch('vis.params.queryFieldName', function () {
        if (!$scope.vis.params.queryFieldName) {
          return;
        }
        const name = $scope.vis.params.queryFieldName;
        let i = -1;
        if (previousName) {
          i = $scope.vis.params.columns.indexOf(previousName);
          if (i > -1) {
            $scope.vis.params.columns.splice(i, 1, name);
          }
        } else {
          i = $scope.vis.params.columns.indexOf(name);
          if (i === -1) {
            $scope.vis.params.columns.push(name);
          }
        }
        previousName = name;
      });

      $scope.$watch('vis.params.enableQueryFields', function () {
        if (!$scope.vis.params.enableQueryFields) {
          if (previousName) {
            const i = $scope.vis.params.columns.indexOf(previousName);
            if (i > -1) {
              $scope.vis.params.columns.splice(i, 1);
            }
          }
          previousName = null;
          delete $scope.vis.params.enableQueryFields;
          delete $scope.vis.params.joinElasticsearchField;
          if ($scope.vis.params.queryDefinitions) {
            $scope.vis.params.queryDefinitions.length = 0;
          }
          delete $scope.vis.params.queryFieldName;
          $scope.vis.dirty = true;
        }
      });

      $scope.$watchMulti([
        'vis.params.showMeticsAtAllLevels',
        'vis.params.datasourceId',
        'vis.params.queryDefinitions'
      ], function () {
        if (!$scope.vis) {
          return;
        }
        savedDatasources.get($scope.vis.params.datasourceId)
        .then((savedDatasource) => {
          $scope.datasourceType = savedDatasource.type;
        });
      });

      // =========================
      // Click handlers
      // =========================

      // holds option validation status
      $scope.clickHandlerValidationStates = [];

      // Initialise the clicks parameters.
      const clickHandlersChanged = $scope.clickHandlersChanged = function () {
        _.each($scope.vis.params.clickOptions, function (clickOption, ind) {
          if (!clickOption.uriFormat && clickOption.type === 'link') {
            clickOption.uriFormat = '@URL@';
          }
        });
      };

      /**
       * Checks if any column has two or more of the same click action
       */
      const _checkForDuplicates = function () {
        $scope.clickHandlerValidationStates.length = 0;
        _.each($scope.vis.params.clickOptions, function (clickOption) {
          $scope.clickHandlerValidationStates.push({
            state: 'valid',
            message: ''
          });
        });

        _.chain($scope.vis.params.clickOptions)
        .countBy(function (clickOption, ind) {
          return clickOption.type + '$#%' + clickOption.columnField;
        })
        .each(function (count, key) {
          if (count !== 1) {
            const parts = key.split('$#%');
            const msg = 'You cannot have more than one action of the same type on a same column: ' +
                      'found ' + count + ' ' + parts[0] + ' actions on the column ' + parts[1];
            notify.warning(msg);
            _.each($scope.vis.params.clickOptions, function (clickOption, index) {
              if (clickOption.type === parts[0] && clickOption.columnField === parts[1]) {
                $scope.clickHandlerValidationStates[index].message = msg;
                $scope.clickHandlerValidationStates[index].state = '';
              }
            });
          }
        });
      };

      $scope.$watch('vis.params.clickOptions', function () {
        clickHandlersChanged();
        _checkForDuplicates();
      }, true);

    }
  };
});
