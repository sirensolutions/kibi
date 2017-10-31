import _ from 'lodash';
import { DocViewsRegistryProvider } from 'ui/registry/doc_views';

import tableHtml from './table.html';

DocViewsRegistryProvider.register(function () {
  return {
    title: 'Table',
    order: 10,
    directive: {
      template: tableHtml,
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=',
        columns: '=',
        columnAliases: '=', // kibi: column aliases
        onAddColumn: '=',
        onRemoveColumn: '='
      },
      controller: function ($scope) {
        $scope.mapping = $scope.indexPattern.fields.byName;
        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.formatted = $scope.indexPattern.formatHit($scope.hit);
        $scope.fields = _.keys($scope.flattened).sort();

        // kibi: constructing aliases map and handle more like this filters
        $scope.aliases = {};
        _.each($scope.fields, (fieldName) =>{
          $scope.aliases[fieldName] = fieldName;
          if ($scope.columns && $scope.columnAliases && $scope.columnAliases.length > 0) {
            const index = $scope.columns.indexOf(fieldName);
            if ($scope.columnAliases[index]) {
              $scope.aliases[fieldName] = $scope.columnAliases[index];
            }
          }
        });

        $scope.isForMoreLikeThis = function (fieldName) {
          if ($scope.indexPattern.metaFields.includes(fieldName)) {
            return false;
          }
          if ($scope.mapping[fieldName]) {
            const dataType = $scope.mapping[fieldName].esType;
            return dataType === 'text';
          }
          return false;
        };
        // kibi: end

        $scope.canToggleColumns = function canToggleColumn() {
          return (
            _.isFunction($scope.onAddColumn)
            && _.isFunction($scope.onRemoveColumn)
          );
        };

        $scope.toggleColumn = function toggleColumn(columnName) {
          if ($scope.columns.includes(columnName)) {
            $scope.onRemoveColumn(columnName);
          } else {
            $scope.onAddColumn(columnName);
          }
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          const value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };
      }
    }
  };
});
