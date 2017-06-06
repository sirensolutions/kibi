import * as columnsActions from './actions/columns';
import _ from 'lodash';
import 'ui/kibi/directives/kibi_select';
import 'ui/kibi/directives/kibi_array_param';
import uiModules from 'ui/modules';
import template from 'plugins/kibi_data_table_vis/kibi_data_table_vis_params.html';

uiModules
.get('kibana/kibi_data_table_vis')
.directive('kibiDataTableVisParams', function (savedDatasources, $rootScope, $route, createNotifier, kbnUrl) {
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

      const removeColumnAddListener = $rootScope.$on('kibi:column:add', (event, columnName) => {
        columnsActions.addColumn($scope.vis.params, columnName);
        // force the editable vis to be staged
        // this is needed because both the vis and the editableVis got already updated and so the visualization is not flagged as dirty
        $rootScope.$emit('stageEditableVis');
      });

      const removeColumnRemoveListener = $rootScope.$on('kibi:column:remove', (event, columnName) => {
        columnsActions.removeColumn($scope.vis.params, columnName);
        $rootScope.$emit('stageEditableVis');
      });

      const removeColumnMoveListener = $rootScope.$on('kibi:column:move', (event, columnName, newIndex) => {
        columnsActions.moveColumn($scope.vis.params, columnName, newIndex);
        $rootScope.$emit('stageEditableVis');
      });

      const removeDisableQueryFieldsListener = $rootScope.$on('disableQueryFields', () => {
        $scope.vis.params.enableQueryFields = false;
      });

      const removeRemoveClickOptionsListener = $rootScope.$on('removeClickOptions', (event, columnName) => {
        _.remove($scope.vis.params.clickOptions, 'columnField', columnName);
      });

      $scope.$on('$destroy', function () {
        removeColumnAddListener();
        removeColumnRemoveListener();
        removeColumnMoveListener();
        removeDisableQueryFieldsListener();
        removeRemoveClickOptionsListener();
      });

      // ====================================
      // Visualization controller integration
      // ====================================

      $scope.rejectQueryFieldName = columnName => !$scope.vis.params.enableQueryFields || columnName !== $scope.vis.params.queryFieldName;

      $scope.jumpToTemplate = function () {
        kbnUrl.change('/management/siren/templates/' + $scope.vis.params.templateId);
      };

      $scope.filterTemplates = function (item) {
        return item ? item.templateEngine !== 'html-angular' : true;
      };

      // ==============
      // Column Aliases
      // ==============

      $scope.$watchCollection('vis.params.columns', columns => {
        populateColumnAliases();
      });

      $scope.columnAliasesValidation = function () {
        if (!$scope.aliasValidStatus) {
          $scope.aliasValidStatus = [];
        }
        $scope.columnAliasesValid = true;
        _.each($scope.vis.params.columnAliases, function (alias, index) {
          $scope.aliasValidStatus[index] = true;
          const count = _.sum($scope.vis.params.columnAliases, alias2 => alias === alias2);
          if (count > 1) {
            $scope.aliasValidStatus[index] = false;
            $scope.columnAliasesValid = '';
          }
        });
      };
      $scope.columnAliasesValidation();

      $scope.$watch('vis.params.templateId', function (templateId) {
        $rootScope.$emit('kibi:vis:templateId-changed', templateId);
      }, true);

      function populateColumnAliases() {
        // prepopulate aliases to original names if not defined
        _.each($scope.vis.params.columns, (columnName, index) => {
          if (!$scope.vis.params.columnAliases[index]) {
            $scope.vis.params.columnAliases[index] = columnName;
          }
        });
        $scope.columnAliasesValidation();
      }

      $scope.$watch('vis.params.enableColumnAliases', enableColumnAliases => {
        if (enableColumnAliases) {
          populateColumnAliases();
        } else {
          $scope.vis.params.columnAliases = [];
        }
      });

      // =======
      // Queries
      // =======

      let previousName = null;
      $scope.$watch('vis.params.queryFieldName', function () {
        if (!$scope.vis.params.queryFieldName) {
          return;
        }
        const name = $scope.vis.params.queryFieldName;

        if (previousName) {
          columnsActions.renameColumn($scope.vis.params, previousName, name);
        } else {
          columnsActions.addColumn($scope.vis.params, name);
        }
        previousName = name;
      });

      $scope.$watch('vis.params.enableQueryFields', function () {
        if (!$scope.vis.params.enableQueryFields) {
          if (previousName) {
            columnsActions.removeColumn($scope.vis.params, previousName);
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

      // ==============
      // Click handlers
      // ==============

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
        })
        .value();
      };

      $scope.$watch('vis.params.clickOptions', function () {
        clickHandlersChanged();
        _checkForDuplicates();
      }, true);
    }
  };
});
