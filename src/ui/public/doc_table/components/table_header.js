import _ from 'lodash';
import 'ui/filters/short_dots';
import headerHtml from 'ui/doc_table/components/table_header.html';
import { uiModules } from 'ui/modules';
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

      //kibi: these are required for fixed header in kibi enhanced table
      $element[0].querySelector('#fixed-header').style.display = 'none';
      const headerOffsets = [];

      //assign fixed header columns width from relative header
      const initialHeadersClientWidth = function () {
        headerOffsets.length = 0;
        const headers = $element[0].querySelector('#relative-header').cells;
        for(let i = 0; i < headers.length; i++) {
          const width = Math.round((headers[i].getBoundingClientRect().width) * 100) / 100;
          headerOffsets.push(width);
        }
      };

      //set fixed header position in table
      const alignFixedHeader = function (visWidth, visLeftOffset, parentLeftOffset) {
        const fixedHeader = $element[0].querySelector('#fixed-header');
        if (visWidth && visLeftOffset && parentLeftOffset) {
          fixedHeader.style.left = parentLeftOffset - visLeftOffset + 'px';
          fixedHeader.style.width = visWidth - parentLeftOffset + visLeftOffset - 14 + 'px';
        } else {
          fixedHeader.style.width = '95%';
          fixedHeader.style.left = '';
        }

        for(let i = 0; i < fixedHeader.cells.length; i++) {
          fixedHeader.cells[i].setAttribute('style','width: ' + headerOffsets[i] + 'px; min-width: ' + headerOffsets[i] + 'px;');
        }
      };

      $timeout(function () {
        initialHeadersClientWidth();
        alignFixedHeader();
      });

      //listen 'visResized' event from visualize.js and configure fixed header
      $scope.$on('visResized', function (event, visLeftOffset, visWidth, columns) {
        if(!_.isEqual(event.currentScope.columns, columns)) {
          return;
        }

        const parentLeftOffset = $element.parent().offset().left;
        initialHeadersClientWidth();
        alignFixedHeader(visWidth, visLeftOffset, parentLeftOffset);
      });

      //when user switch to standart template configure fixed header
      $scope.$watch(function () { return $element.parent().is(':visible'); },
      function (oldValue,newValue) {
        if(newValue === oldValue) {
          return;
        }
        initialHeadersClientWidth();
        alignFixedHeader();
      });

      //listen 'visScrolled' event from visualize.js and configure fixed header
      $scope.$on('visScrolled', function (event, visTopOffset, visLeftOffset, visWidth, columns) {
        if(!_.isEqual(event.currentScope.columns, columns)) {
          return;
        }

        const elemTop =  $element.offset().top;
        const parentLeftOffset = $element.parent().offset().left;
        const fixedHeader = $element[0].querySelector('#fixed-header');
        const relativeHeader = $element[0].querySelector('#relative-header');

        if (elemTop > visTopOffset) {
          fixedHeader.style.display = 'none';
          relativeHeader.style.visibility = '';
        } else {
          relativeHeader.style.visibility = 'hidden';
          fixedHeader.style.position = 'absolute';
          fixedHeader.style.display = '';
          fixedHeader.style.top = '0px';
          fixedHeader.style.backgroundColor = 'white';
          fixedHeader.style.zIndex = '100';
          fixedHeader.style.overflow = 'hidden';
          fixedHeader.style.marginRight = '13px';

          initialHeadersClientWidth();
          alignFixedHeader(visWidth, visLeftOffset, parentLeftOffset);
        }
      });
      //kibi: end

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
