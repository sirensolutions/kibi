import _ from 'lodash';
import uiModules from 'ui/modules';
import template from './kibi_table_sorting.html';

uiModules
.get('app/discover')
.directive('kibiTableSorting', function ($rootScope) {

  return {
    restrict: 'E',
    scope: {
      columns: '=',
      sorting: '='
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

      $scope.sortingColumns = [
        {
          value: '_score',
          label: 'score'
        }
      ];

      _.each($scope.columns, (column) => {
        $scope.sortingColumns.push({
          value: column,
          label: column
        });
      });

      $scope.selectedSortingColumn = _.find($scope.sortingColumns, (column) => {
        return column.value === $scope.sorting[0];
      });

      $scope.selectedSortingOrder = _.find($scope.sortingOrder, (order) => {
        return order.value === $scope.sorting[1];
      });

      $scope.changedSortingSelection = function () {
        $scope.sorting = [$scope.selectedSortingColumn.value, $scope.selectedSortingOrder.value];
      };
    }
  };

});
