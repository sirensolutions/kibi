define(function (require) {
  // get the kibana/table_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('modules').get('kibana/table_vis', ['kibana']);

  // add a controller to tha module, which will transform the esResponse into a
  // tabular format that we can pass to the table directive
  module.controller('KbnTableVisController', function ($scope, Private, globalState, $rootScope, courier) {
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));

    // added by kibi - start
    $scope.holder = {
      visible: $('#relational-filters-params').length > 0,
      entityURIEnabled: false,
      entityURI: ''
    };
    if (globalState.entityURI) {
      $scope.holder.entityURI = globalState.entityURI;
    }

    var off = $rootScope.$on('kibi:entityURIEnabled', function (event, enabled) {
      $scope.holder.entityURIEnabled = !!enabled;
    });
    $scope.$on('$destroy', off);

    $scope.$watch('holder.entityURI', function (entityURI) {
      if (entityURI && $scope.holder.visible) {
        globalState.entityURI = entityURI;
        globalState.entityLabel = '';
        globalState.save();
        // redraw the table with the selected entity
        courier.fetch();
      }
    });
    // added by kibi - end

    $scope.$watch('esResponse', function (resp, oldResp) {
      // added by kibi - start
      $scope.holder.visible = $('#relational-filters-params').length > 0;
      // added by kibi - end

      var tableGroups = $scope.tableGroups = null;
      var hasSomeRows = $scope.hasSomeRows = null;

      if (resp) {
        var vis = $scope.vis;
        var params = vis.params;

        tableGroups = tabifyAggResponse(vis, resp, {
          partialRows: params.showPartialRows,
          minimalColumns: vis.isHierarchical() && !params.showMeticsAtAllLevels,
          asAggConfigResults: true
        });

        hasSomeRows = tableGroups.tables.some(function haveRows(table) {
          if (table.tables) return table.tables.some(haveRows);
          return table.rows.length > 0;
        });
      }

      $scope.hasSomeRows = hasSomeRows;
      if (hasSomeRows) {
        $scope.tableGroups = tableGroups;
      }

    });
  });

});
