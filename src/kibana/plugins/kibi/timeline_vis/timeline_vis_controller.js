define(function (require) {

  var module = require('modules').get('kibana/kibi/timeline_vis', ['kibana']);
  module.controller(
    'KbnTimelineVisController',
    function ($rootScope, $scope, $route, $log, courier, savedVisualizations, Private, $element) {

      var requestQueue = Private(require('components/courier/_request_queue'));
      var SearchSource = Private(require('components/courier/data_source/search_source'));

      // Set to true in editing mode
      var editing = false;

      $scope.savedVis = $route.current.locals.savedVis;
      if ($scope.savedVis) {
        editing = true;
      } else {
        // NOTE: reloading the visualization to get the searchSource,
        // which would otherwise be unavailable by design
        savedVisualizations.get($scope.vis.id).then(function (savedVis) {
          $scope.vis = savedVis.vis;
          $scope.savedVis = savedVis;
        });
      }

      var _id = '_kibi_timetable_ids_source_flag' + $scope.vis.id;

      function fetchResults(savedVis) {

        var indexPattern = $scope.vis.indexPattern;

        if ($scope.savedObj && $scope.savedObj.searchSource) {
          $scope.savedObj.searchSource.destroy();
        }
        requestQueue.markAllRequestsWithSourceIdAsInactive(_id);

        var searchSource = new SearchSource();
        searchSource.inherits(savedVis.searchSource);

        searchSource._id = _id;
        searchSource.index(indexPattern);
        searchSource.size(savedVis.vis.params.size || 100);

        $scope.savedObj = {
          searchSource: searchSource
        };
        courier.fetch();
      }

      function initOptions(savedVis) {
        var options = {
          width: '100%',
          height: ($element[0].offsetHeight || 350) + 'px',
          selectable: true,
          // ! does not work correctly inside the panel
          // instead we would have to calculate the proper height on panel resize and change it
          // on change timeline directive should call redraw()
          autoResize: false
        };

        if (savedVis) {
          if (!savedVis.vis.params.endField ) {
            options.type = 'box';
          } else if (savedVis.vis.params.endField && savedVis.vis.params.startField === savedVis.vis.params.endField) {
            options.type = 'point';
          } else if (savedVis.vis.params.endField && savedVis.vis.params.startField !== savedVis.vis.params.endField) {
            options.type = 'range';
          }
        }

        $scope.options = options;
      }

      function initParams(savedVis) {
        var params = {
          labelField: savedVis.vis.params.labelField,
          startField: savedVis.vis.params.startField,
          endField: savedVis.vis.params.endField,
          clickedItemId: savedVis.vis.params.clickedItemId
        };

        $scope.params = params;
      }

      $scope.$on('change:vis', function () {
        if ($scope.options) {
          $scope.options.height = $element[0].offsetHeight;
        }
      });

      $scope.$watch('vis', function () {
        if ($scope.savedVis) {
          fetchResults($scope.savedVis);
          initParams($scope.savedVis);
          initOptions($scope.savedVis);
        }
      });

      // used also in autorefresh mode
      $scope.$watch('esResponse', function () {
        if ($scope.savedObj && $scope.savedObj.searchSource) {
          $scope.savedObj.searchSource.fetchQueued();
        }
      });

      if (editing) {
        var removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
          initOptions($scope.savedVis);
          initParams($scope.savedVis);
          fetchResults($scope.savedVis);
        });

        $scope.$on('$destroy', function () {
          removeVisStateChangedHandler();
        });
      }

    });
});
