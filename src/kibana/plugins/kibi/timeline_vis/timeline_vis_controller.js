define(function (require) {

  var module = require('modules').get('kibana/kibi/timeline_vis', ['kibana']);
  module.controller('KbnTimelineVisController', function ($rootScope, $scope, $route, $log, courier, savedVisualizations, Private) {

    var requestQueue = Private(require('components/courier/_request_queue'));
    var SearchSource = Private(require('components/courier/data_source/search_source'));

    // Set to true in editing mode
    var editing = false;

    $scope.savedVis = $route.current.locals.savedVis;
    if ($scope.savedVis) {
      editing = true;
    } else {
      //NOTE: reloading the visualization to get the searchSource,
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
        searchSource: searchSource,
      };
      courier.fetch();
    }

    function setOptions(savedVis) {
      var options = {
        width: '100%',
        height: (savedVis.vis.params.height || 350) + 'px',
        selectable: true,
        autoResize: false
      };
      $scope.options = options;
    }

    function setParams(savedVis) {
      var params = {
        labelField: savedVis.vis.params.labelField,
        startField: savedVis.vis.params.startField,
        endField: savedVis.vis.params.endField,
        clickedItemId: savedVis.vis.params.clickedItemId
      };

      $scope.params = params;
    }

    $scope.$watch('vis', function () {

      if ($scope.savedVis) {
        fetchResults($scope.savedVis);
        setOptions($scope.savedVis);
        setParams($scope.savedVis);
      }
    });

    $scope.$watch('esResponse', function () {
      if ($scope.savedObj && $scope.savedObj.searchSource) {
        $scope.savedObj.searchSource.fetchQueued();
      }
    });

    if (editing) {
      var removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
        fetchResults($scope.savedVis);
        setOptions($scope.savedVis);
        setParams($scope.savedVis);
      });

      $scope.$on('$destroy', function () {
        removeVisStateChangedHandler();
      });
    }

  });

});
