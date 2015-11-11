define(function (require) {
  // get the kibana/table_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('modules').get('kibana/table_vis', ['kibana']);

  // add a controller to tha module, which will transform the esResponse into a
  // tabular format that we can pass to the table directive
  module.controller('KbnTableVisController', function ($scope, Private, globalState, $rootScope, courier, $location) {
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));
    var _set_entity_uri =  Private(require('plugins/kibi/commons/_set_entity_uri'));

    // added by kibi - start
    $scope.holder = {
      visible: $location.path().indexOf('/visualize/') === 0,
      entityURIEnabled: false,
      entityURI: ''
    };

    _set_entity_uri($scope.holder);
    var off1 = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
      _set_entity_uri($scope.holder);
    });

    var off2 = $rootScope.$on('kibi:entityURIEnabled:customqueries', function (event, enabled) {
      $scope.holder.entityURIEnabled = !!enabled;
    });
    $scope.$on('$destroy', function () {
      off1();
      off2();
    });

    $scope.$watch('holder.entityURI', function (entityURI) {
      if (entityURI && $scope.holder.visible) {
        // here we have to set a temporary value for se
        globalState.se_temp = [entityURI];
        globalState.save();
        // redraw the table with the selected entity
        courier.fetch();
      }
    });
    // added by kibi - end

    $scope.$watch('esResponse', function (resp, oldResp) {
      // added by kibi - start
      $scope.holder.visible = $location.path().indexOf('/visualize/') === 0;
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
