import _ from 'lodash';
import 'ui/filters/short_dots';
import headerHtml from 'ui/doc_table/components/table_header.html';
import uiModules from 'ui/modules';
const module = uiModules.get('app/discover');


module.directive('kbnTableHeader', function (shortDotsFilter) {
  return {
    restrict: 'A',
    scope: {
      columns: '=',
      sorting: '=',
      indexPattern: '=',
    },
    template: headerHtml,
    controller: function ($rootScope, $scope) {

      const sortableField = function (field) {
        if (!$scope.indexPattern) return;
        const sortable = _.get($scope.indexPattern.fields.byName[field], 'sortable');
        return sortable;
      };

      $scope.tooltip = function (column) {
        if (!sortableField(column)) return '';
        return 'Sort by ' + shortDotsFilter(column);
      };

      $scope.canRemove = function (name) {
        return (name !== '_source' || $scope.columns.length !== 1);
      };

      $scope.headerClass = function (column) {
        if (!sortableField(column)) return;

        const sorting = $scope.sorting;
        const defaultClass = ['fa', 'fa-sort-up', 'table-header-sortchange'];

        if (!sorting || column !== sorting[0]) return defaultClass;
        return ['fa', sorting[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
      };

      $scope.moveLeft = function (column) {
        let index = _.indexOf($scope.columns, column);
        if (index === 0) return;

        _.move($scope.columns, index, --index);
      };

      $scope.moveRight = function (column) {
        let index = _.indexOf($scope.columns, column);
        if (index === $scope.columns.length - 1) return;

        _.move($scope.columns, index, ++index);
      };

      $scope.toggleColumn = function (fieldName) {
        // kibi: emit kibi:remove:column in order to clean the clickOptions on a column
        if (_.contains($scope.columns, fieldName)) {
          const ind = $scope.columns.indexOf(fieldName);
          $scope.columns.splice(ind, 1);
          $rootScope.$emit('kibi:remove:column', { fieldName, index: ind });
        } else {
          $scope.columns.push(fieldName);
        }
      };

      // kibi: listen to the kibi:add:column event for adding extra columns to the table
      const off = $rootScope.$on('kibi:add:column', function (event, column) {
        if (column) {
          $scope.columns.splice(column.index, 0, column.fieldName);
        }
      });
      $scope.$on('$destroy', off);

      $scope.sort = function (column) {
        if (!column || !sortableField(column)) return;

        const sorting = $scope.sorting = $scope.sorting || [];

        let direction = sorting[1] || 'asc';
        if (sorting[0] !== column) {
          direction = 'asc';
        } else {
          direction = sorting[1] === 'asc' ? 'desc' : 'asc';
        }

        $scope.sorting[0] = column;
        $scope.sorting[1] = direction;
      };
    }
  };
});
