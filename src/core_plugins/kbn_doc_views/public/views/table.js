import _ from 'lodash';
import docViewsRegistry from 'ui/registry/doc_views';

import tableHtml from './table.html';

docViewsRegistry.register(function () {
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
        columnAliases: '='
      },
      controller: function ($scope) {
        $scope.mapping = $scope.indexPattern.fields.byName;
        $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
        $scope.formatted = $scope.indexPattern.formatHit($scope.hit);
        $scope.fields = _.keys($scope.flattened).sort();

        // kibi: constructing aliases map
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
        // kibi: end

        $scope.toggleColumn = function (fieldName) {
          _.toggleInOut($scope.columns, fieldName);
        };

        $scope.showArrayInObjectsWarning = function (row, field) {
          const value = $scope.flattened[field];
          return _.isArray(value) && typeof value[0] === 'object';
        };
      }
    }
  };
});
