import _ from 'lodash';
import { uiModules } from 'ui/modules';
import template from './kibi_table_sorting.html';

uiModules
.get('app/discover')
.directive('kibiTableSorting', function ($rootScope) {

  return {
    restrict: 'E',
    scope: {
      columns: '=',
      columnAliases: '=',
      sorting: '=',
      searchSource: '=?'
    },
    template: template,
    link: function ($scope, $el, attrs) {
      $scope.sortingOrder = [
        {
          value: 'asc',
          label: 'ascending'
        },
        {
          value: 'desc',
          label: 'descending'
        }
      ];

      function populateSortingColumns() {
        $scope.sortingColumns = [
          {
            value: '_score',
            label: 'score'
          }
        ];

        $scope.indexPattern = $scope.searchSource.get('index');
        _.each($scope.columns, (column, i) => {
          if ($scope.indexPattern.fields.byName[column] && $scope.indexPattern.fields.byName[column].sortable) {
            $scope.sortingColumns.push({
              value: column,
              label: $scope.columnAliases[i] || column // alias or real name when aliases not used
            });
          }
        });
      }
      populateSortingColumns();

      $scope.selectedSortingColumn = _.find($scope.sortingColumns, (column) => {
        return column.value === $scope.sorting[0];
      });

      $scope.selectedSortingOrder = _.find($scope.sortingOrder, (order) => {
        return order.value === $scope.sorting[1];
      });

      $scope.changedSortingSelection = function () {
        $scope.sorting = [$scope.selectedSortingColumn.value, $scope.selectedSortingOrder.value];
      };

      $scope.$watchGroup([ 'columns', 'columnAliases' ], ([ newColumns, newColumnAliases ]) => {
        if (newColumns || newColumnAliases) {
          populateSortingColumns();
        }
      });
    }
  };

});
