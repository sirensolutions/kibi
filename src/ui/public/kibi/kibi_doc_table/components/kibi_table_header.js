define(function (require) {
  const _ = require('lodash');
  const module = require('ui/modules').get('app/discover');

  require('ui/filters/short_dots');

  module.directive('kibiTableHeader', function (shortDotsFilter, $rootScope) {
    const headerHtml = require('ui/kibi/kibi_doc_table/components/kibi_table_header.html');
    return {
      restrict: 'A',
      scope: {
        columns: '=',
        columnAliases: '=?',
        cellClickHandlers: '=',
        indexPattern: '=',
        options: '='
      },
      template: headerHtml,
      controller: function ($scope) {

        const sortableField = function (field) {
          if (!$scope.indexPattern) return;
          const sortable = _.get($scope.indexPattern.fields.byName[field], 'sortable');
          return sortable;
        };

        $scope.filterableColumn = function (name) {
          if ($scope.cellClickHandlers
            && $scope.cellClickHandlers[name] && $scope.cellClickHandlers[name][0].type === 'filter') {
            return true;
          }
          return false;
        };

        $scope.tooltip = function (column) {
          if (!sortableField(column)) return '';
          if ($scope.columnAliases.length > 0) {
            const index = $scope.columns.indexOf(column);
            return 'Sort by ' + shortDotsFilter($scope.columnAliases[index]);
          }
          return 'Sort by ' + shortDotsFilter(column);
        };

        $scope.canRemove = function (name) {
          return (name !== '_source' || $scope.columns.length !== 1);
        };

        $scope.headerClass = function (column) {
          if (!sortableField(column)) return;

          const sorting = $scope.options.sorting;
          const defaultClass = ['fa', 'fa-sort-up', 'table-header-sortchange'];

          if (!sorting || column !== sorting[0]) return defaultClass;
          return ['fa', sorting[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
        };

        $scope.moveLeft = function (column) {
          const index = _.indexOf($scope.columns, column);
          if (index === 0) return;

          if ($scope.columnAliases) {
            _.move($scope.columnAliases, index, index - 1); // kibi: added to also move the alias
          }
          _.move($scope.columns, index, index - 1);
        };

        $scope.moveRight = function (column) {
          const index = _.indexOf($scope.columns, column);
          if (index === $scope.columns.length - 1) return;

          if ($scope.columnAliases) {
            _.move($scope.columnAliases, index, index + 1);  // kibi: added to also move the alias
          }
          _.move($scope.columns, index, index + 1);
        };

        $scope.toggleColumn = function (fieldName) {
          // kibi: emit kibi:remove:column in order to clean the clickOptions on a column
          if (_.contains($scope.columns, fieldName)) {
            const ind = $scope.columns.indexOf(fieldName);
            if ($scope.columnAliases) {
              $scope.columnAliases.splice(ind, 1);
            }
            $scope.columns.splice(ind, 1);
            $rootScope.$emit('kibi:remove:column', { fieldName: fieldName, index: ind });
          } else {
            if ($scope.columnAliases) {
              $scope.columnAliases.push(fieldName);
            }
            $scope.columns.push(fieldName);
          }
        };

        const off = $rootScope.$on('kibi:add:column', function (event, column) {
          if (column) {
            // kibi: adding alias
            if ($scope.columnAliases && $scope.columnAliases.length === $scope.columns.length) {
              $scope.columnAliases.splice(column.index, 0, column.fieldName);
            }
            $scope.columns.splice(column.index, 0, column.fieldName);
          }
        });
        $scope.$on('$destroy', off);

        $scope.sort = function (column) {
          if (!column || !sortableField(column)) return;

          const sorting = $scope.options.sorting = $scope.options.sorting || [];

          let direction = sorting[1] || 'asc';
          if (sorting[0] !== column) {
            direction = 'asc';
          } else {
            direction = sorting[1] === 'asc' ? 'desc' : 'asc';
          }

          $scope.options.sorting = [column, direction];
        };
      }
    };
  });
});
