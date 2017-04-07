define(function (require) {
  const _ = require('lodash');
  const module = require('ui/modules').get('app/discover');
  const template = require('./kibi_table_sorting.html');

  module.directive('kibiTableSorting', function ($rootScope) {

    return {
      restrict: 'E',
      scope: false,
      template: template,
      link: function ($scope, $el, attrs) {

        $scope.sortingOrder = [{
          value: 'asc',
          label: 'ascending'
        },
        {
          value: 'desc',
          label: 'descending'
        }];
        $scope.sortingColumns = [{
          value: '_score',
          label: 'Score'
        }];
        _.each($scope.columns, (column) => {
          $scope.sortingColumns.push({
            value: column,
            label: column
          });
        });
        $scope.selectedSortingColumn = _.find($scope.sortingColumns, (column) => {
          return column.value === $scope.options.sorting[0];
        });
        $scope.selectedSortingOrder = _.find($scope.sortingOrder, (order) => {
          return order.value === $scope.options.sorting[1];
        });

        $scope.changedSortingSelection = function () {
          $scope.options.sorting = [$scope.selectedSortingColumn.value, $scope.selectedSortingOrder.value];
        };
      }
    };

  });
});
