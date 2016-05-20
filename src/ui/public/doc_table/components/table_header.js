define(function (require) {
  var _ = require('lodash');
  var module = require('ui/modules').get('app/discover');

  require('ui/filters/short_dots');

  module.directive('kbnTableHeader', function (shortDotsFilter, $rootScope) {
    var headerHtml = require('ui/doc_table/components/table_header.html');
    return {
      restrict: 'A',
      scope: {
        columns: '=',
        sorting: '=',
        indexPattern: '=',
      },
      template: headerHtml,
      controller: function ($scope) {

        var sortableField = function (field) {
          if (!$scope.indexPattern) return;
          var sortable = _.get($scope.indexPattern.fields.byName[field], 'sortable');
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

          var sorting = $scope.sorting;
          var defaultClass = ['fa', 'fa-sort-up', 'table-header-sortchange'];

          if (!sorting || column !== sorting[0]) return defaultClass;
          return ['fa', sorting[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
        };

        $scope.moveLeft = function (column) {
          var index = _.indexOf($scope.columns, column);
          if (index === 0) return;

          _.move($scope.columns, index, --index);
        };

        $scope.moveRight = function (column) {
          var index = _.indexOf($scope.columns, column);
          if (index === $scope.columns.length - 1) return;

          _.move($scope.columns, index, ++index);
        };

        $scope.toggleColumn = function (fieldName) {
          // kibi: emit kibi:remove:column in order to clean the clickOptions on a column
          if (_.contains($scope.columns, fieldName)) {
            var ind = $scope.columns.indexOf(fieldName);
            $scope.columns.splice(ind, 1);
            $rootScope.$emit('kibi:remove:column', { fieldName: fieldName, index: ind });
          } else {
            $scope.columns.push(fieldName);
          }
        };

        var off = $rootScope.$on('kibi:add:column', function (event, column) {
          if (column) {
            $scope.columns.splice(column.index, 0, column.fieldName);
          }
        });
        $scope.$on('$destroy', off);

        $scope.sort = function (column) {
          if (!column || !sortableField(column)) return;

          var sorting = $scope.sorting = $scope.sorting || [];

          var direction = sorting[1] || 'asc';
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
});
