define(function (require) {
  // get the kibana/table_vis module, and make sure that it requires the "kibana" module if it
  // didn't already
  var module = require('modules').get('kibana/sindicetech_wordcloud_vis', ['kibana']);
  var _ = require('lodash');
  require('jqcloud');
  require('angular-jqcloud');

  // add a controller to tha module, which will transform the esResponse into a
  // tabular format that we can pass to the table directive
  module.controller('SindicetechWordcloudVisController', function ($scope, $element, $rootScope, Private, getAppState) {
    var filterBarClickHandler = Private(require('components/filter_bar/filter_bar_click_handler'));
    var tabifyAggResponse = Private(require('components/agg_response/tabify/tabify'));

    var _updateDimensions = function () {
      var delta = 18;
      var width = $element.parent().width();
      var height = $element.parent().height();
      if (width) {
        if (width > delta) {
          width -= delta;
        }
        $scope.options.width = width;
      }
      if (height) {
        if (height > delta) {
          height -= delta;
        }
        $scope.options.height = height;
      }
    };

    // set default options
    $scope.options = {
      width: 400,
      height: 300,
      colors: ['#800026', '#bd0026', '#e31a1c', '#fc4e2a', '#fd8d3c', '#feb24c', '#fed976'],
      words: []
    };


    var off = $rootScope.$on('change:vis', function () {
      _updateDimensions();
    });
    $scope.$on('$destroy', off);

    $scope.$watch('esResponse', function (resp, oldResp) {
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

        var $state = getAppState();

        var words = [];
        if (tableGroups.tables.length === 1) {
          _.each(tableGroups.tables[0].rows, function (row, index) {
            if (row[0].type === 'bucket'  && row[1].type === 'metric') {
              words.push({
                text: row[0].value,
                weight: row[1].value,
                handlers: {
                  click: function (e) {
                    e.preventDefault();
                    var aggConfigResult = tableGroups.tables[0].rows[index][0];
                    // here create an event and pass to the handler
                    // here take aggConfigResult from first row of the tableGroups
                    var wordCloudEvent = {
                      point: {
                        orig: {
                          aggConfigResult: aggConfigResult
                        }
                      }
                    };
                    filterBarClickHandler($state)(wordCloudEvent);
                  }
                }
              });
            }
          });
        }
        $scope.options.words = words;
      }

      $scope.hasSomeRows = hasSomeRows;
      if (hasSomeRows) {
        $scope.tableGroups = tableGroups;
      }

      _updateDimensions();
    });
  });

});
