define(function (require) {
  let _ = require('lodash');
  let angular = require('angular');
  require('ace');

  let html = require('ui/doc_viewer/doc_viewer.html');
  require('ui/doc_viewer/doc_viewer.less');

  require('ui/modules').get('kibana')
  .directive('docViewer', function (config, Private, $location) {
    return {
      restrict: 'E',
      template: html,
      scope: {
        hit: '=',
        indexPattern: '=',
        filter: '=?',
        columns: '=?',
        columnAliases: '=?' // kibi: added columnAliases this was needed to support aliases in kibi-doc-table
      },
      link: {
        pre($scope) {
          $scope.aceLoaded = (editor) => {
            editor.$blockScrolling = Infinity;
          };
        },

        post($scope, $el, attr) {
          // If a field isn't in the mapping, use this
          $scope.mode = 'table';
          $scope.mapping = $scope.indexPattern.fields.byName;
          $scope.flattened = $scope.indexPattern.flattenHit($scope.hit);
          $scope.hitJson = angular.toJson($scope.hit, true);
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
            let value = $scope.flattened[field];
            return _.isArray(value) && typeof value[0] === 'object';
          };
        }
      }
    };
  });
});
