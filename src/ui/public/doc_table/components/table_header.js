import _ from 'lodash';
import $ from 'jquery';
import 'ui/filters/short_dots';
import headerHtml from 'ui/doc_table/components/table_header.html';
import uiModules from 'ui/modules';
const module = uiModules.get('app/discover');


module.directive('kbnTableHeader', function (shortDotsFilter, $timeout) {
  return {
    restrict: 'A',
    scope: {
      columns: '=',
      sortOrder: '=',
      indexPattern: '=',
      onChangeSortOrder: '=?',
      onRemoveColumn: '=?',
      onMoveColumn: '=?',
      // kibi: list of column aliases
      columnAliases: '=?',
      // kibi: list of column min width
      columnMinWidth: '=?',
      // kibi: make time field column optional
      disableTimeField: '=?'
    },
    template: headerHtml,
    controller: function ($rootScope, $scope, $element) {
      const isSortableColumn = function isSortableColumn(columnName) {
        return (
          !!$scope.indexPattern
          && _.isFunction($scope.onChangeSortOrder)
          && _.get($scope, ['indexPattern', 'fields', 'byName', columnName, 'sortable'], false)
        );
      };

      const deleteIt = $element.parent();

      $element[0].querySelector('#fixed-header').style.display = 'none';
      const headerOffsets = [];

      const initialHeadersClientWidth = function () {
        headerOffsets.length = 0;
        const headers = $element[0].querySelector('#relative-header').cells;
        for(let i = 0; i < headers.length; i++) {
          headerOffsets.push(headers[i].clientWidth);
        }
      };

      const allignFixedHeaderWidth = function () {
        for(let i = 0; i < $element[0].childNodes[0].cells.length; i++) {
          $element[0].querySelector('#fixed-header').cells[i].width = headerOffsets[i];
        }
      };

      $timeout(function () {
        initialHeadersClientWidth();
        allignFixedHeaderWidth();
      });

      $scope.$watch(
        function () {
          return {
            width: $element.parent().width(),
            height: $element.parent().height(),
          };
        },
       function (newValue, oldValue) {
         if(newValue === oldValue) {
           return;
         }

         $timeout(function () {
           initialHeadersClientWidth();
           allignFixedHeaderWidth();
         });
       },
       true
    );

      $scope.$watch(function () { return $element.parent().is(':visible'); },
      function (oldValue,newValue) {
        if(newValue === oldValue) {
          return;
        }
        $timeout(function () {
          initialHeadersClientWidth();
          allignFixedHeaderWidth();
        });
      });

      $scope.$on('visScrolled', function (event, docViewTop, columns) {

        if(!_.isEqual(event.currentScope.columns, columns)) {
          return;
        }

        const elemTop =  $element.offset().top;

        if (elemTop > docViewTop) {
          $element[0].querySelector('#fixed-header').style.display = 'none';
          $element[0].querySelector('#relative-header').style.visibility = '';
        } else {
          $element[0].querySelector('#relative-header').style.visibility = 'hidden';
          $element[0].querySelector('#fixed-header').style.position = 'absolute';
          $element[0].querySelector('#fixed-header').style.display = '';
          $element[0].querySelector('#fixed-header').style.top = '0px';
          $element[0].querySelector('#fixed-header').style.backgroundColor = 'white';
          $element[0].querySelector('#fixed-header').style.zIndex = '100';
          allignFixedHeaderWidth();
        }
      });

      $scope.tooltip = function (column) {
        if (!isSortableColumn(column)) return '';
        // kibi: use the column alias for the tooltip
        if ($scope.columnAliases && $scope.columnAliases.length) {
          const index = $scope.columns.indexOf(column);
          return 'Sort by ' + shortDotsFilter($scope.columnAliases[index]);
        }
        // kibi: end
        return 'Sort by ' + shortDotsFilter(column);
      };

      $scope.canMoveColumnLeft = function canMoveColumn(columnName) {
        return (
          _.isFunction($scope.onMoveColumn)
          && $scope.columns.indexOf(columnName) > 0
        );
      };

      $scope.canMoveColumnRight = function canMoveColumn(columnName) {
        return (
          _.isFunction($scope.onMoveColumn)
          && $scope.columns.indexOf(columnName) < $scope.columns.length - 1
        );
      };

      $scope.canRemoveColumn = function canRemoveColumn(columnName) {
        return (
          _.isFunction($scope.onRemoveColumn)
          && (columnName !== '_source' || $scope.columns.length > 1)
        );
      };

      $scope.headerClass = function (column) {
        if (!isSortableColumn(column)) return;

        const sortOrder = $scope.sortOrder;
        const defaultClass = ['fa', 'fa-sort-up', 'table-header-sortchange'];

        if (!sortOrder || column !== sortOrder[0]) return defaultClass;
        return ['fa', sortOrder[1] === 'asc' ? 'fa-sort-up' : 'fa-sort-down'];
      };

      $scope.moveColumnLeft = function moveLeft(columnName) {
        const newIndex = $scope.columns.indexOf(columnName) - 1;

        if (newIndex < 0) {
          return;
        }

        $scope.onMoveColumn(columnName, newIndex);
      };

      $scope.moveColumnRight = function moveRight(columnName) {
        const newIndex = $scope.columns.indexOf(columnName) + 1;

        if (newIndex >= $scope.columns.length) {
          return;
        }

        $scope.onMoveColumn(columnName, newIndex);
      };

      $scope.cycleSortOrder = function cycleSortOrder(columnName) {
        if (!isSortableColumn(columnName)) {
          return;
        }

        const [currentColumnName, currentDirection = 'asc'] = $scope.sortOrder;
        const newDirection = (
          (columnName === currentColumnName && currentDirection === 'asc')
          ? 'desc'
          : 'asc'
        );

        $scope.onChangeSortOrder(columnName, newDirection);
      };
    }
  };
});
