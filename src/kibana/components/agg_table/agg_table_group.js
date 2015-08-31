define(function (require) {
  var $ = require('jquery');
  require('services/compile_recursive_directive');
  require('components/agg_table/agg_table');

  require('modules')
  .get('kibana')
  .directive('kbnAggTableGroup', function (compileRecursiveDirective, globalState, $rootScope, courier) {
    return {
      restrict: 'E',
      template: require('text!components/agg_table/agg_table_group.html'),
      scope: {
        group: '=',
        perPage: '=?',
        queryFieldName: '=?'
      },
      compile: function ($el) {
        // Use the compile function from the RecursionHelper,
        // And return the linking function(s) which it returns
        return compileRecursiveDirective.compile($el, {
          post: function ($scope) {
            // added by kibi
            $scope.holder = {
              visible: $('#relational-filters-params').length > 0,
              entityURIEnabled: false,
              entityURI: ''
            };
            if (globalState.entityURI) {
              $scope.holder.entityURI = globalState.entityURI;
            }

            $rootScope.$on('kibi:entityURIEnabled', function (event, enabled) {
              if (enabled) {
                $scope.holder.entityURIEnabled = enabled;
              }
            });
            // added by kibi - end

            $scope.$watch('holder.entityURI', function (entityURI) {
              if (entityURI && $scope.holder.visible) {
                globalState.entityURI = entityURI;
                globalState.entityLabel = '';
                globalState.save();
                // redraw the table with the selected entity
                courier.fetch();
              }
            });

            $scope.$watch('group', function (group) {
              // clear the previous "state"
              $scope.rows = $scope.columns = false;

              if (!group || !group.tables.length) return;

              var firstTable = group.tables[0];
              var params = firstTable.aggConfig && firstTable.aggConfig.params;
              // render groups that have Table children as if they were rows, because itteration is cleaner
              var childLayout = (params && !params.row) ? 'columns' : 'rows';

              $scope[childLayout] = group.tables;
            });
          }
        });
      }
    };
  });
});
