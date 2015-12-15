define(function (require) {
  var _ = require('lodash');

  var module = require('modules').get('kibana/kibi/timeline_vis', ['kibana']);
  module.controller(
    'KbnTimelineVisController',
    function ($rootScope, $scope, $route, $log, courier, savedSearches, savedVisualizations, Private, $element, Promise) {

      var requestQueue = Private(require('components/courier/_request_queue'));
      var SearchSource = Private(require('components/courier/data_source/search_source'));

      $scope.savedObj = {
        groups: []
      };
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

      $scope.$on('change:vis', function () {
        initOptions($scope.savedVis);
      });

      $scope.$watch('vis', function () {
        if ($scope.savedVis) {
          initOptions($scope.savedVis);
          initSearchSources($scope.savedVis);
        }
      });

      // used also in autorefresh mode
      $scope.$watch('esResponse', function () {
        if ($scope.savedObj && $scope.savedObj.searchSources) {
          _.each($scope.savedObj.searchSources, function (ss) {
            ss.fetchQueued();
          });
        }
      });

      if (editing) {
        var removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
          initOptions($scope.savedVis, true);
          initSearchSources($scope.savedVis);
        });

        $scope.$on('$destroy', function () {
          removeVisStateChangedHandler();
        });
      }

      function initOptions(savedVis, inEditMode) {
        var height = $element[0].offsetHeight;
        // make sure that it is never too small
        // as the height might be reported wrongly when element is not yet fully rendered
        if (height < 175) {
          height = 175;
        }

        if (height > 175) {
          height -= 25;
        }

        var options = {
          width: '100%',
          height: height + 'px',
          selectable: true,
          // ! does not work correctly inside the panel
          // instead we would have to calculate the proper height on panel resize and change it
          // on change timeline directive should call redraw()
          autoResize: false
        };
        $scope.options = options;
      }

      var initSearchSources = function (savedVis) {

        // here iterate over groups from savedVis.vis.params.groups
        var promises = [];
        _.each(savedVis.vis.params.groups, function (group) {
          if (group.savedSearchId) {
            promises.push(
              savedSearches.get(group.savedSearchId).then(function (savedSearch) {
                return {
                  savedSearch: savedSearch,
                  group: group
                };
              })
            );
          }
        });


        Promise.all(promises).then(function (results) {
          var groups = [];

          _.each(results, function (result) {
            var savedSearch = result.savedSearch;
            var group = result.group;

            var _id = '_kibi_timetable_ids_source_flag' + savedSearch.id;
            requestQueue.markAllRequestsWithSourceIdAsInactive(_id);

            var size = group.size || 100;
            var searchSource = new SearchSource();
            searchSource.inherits(savedSearch.searchSource);
            searchSource._id = _id;
            searchSource.index(savedSearch.searchSource._state.index);
            searchSource.size(size);

            groups.push({
              id: group.id,
              savedSearchId: savedSearch.id,
              label: group.groupLabel,
              searchSource: searchSource,
              // *size* used to track that sized was changed and points has to be reloaded
              size: size,
              params: {
                labelField: group.labelField,
                startField: group.startField,
                endField: group.endField
              }
            });
          });

          $scope.savedObj.groups = groups;
          $scope.savedObj.groupsOnSeparateLevels = savedVis.vis.params.groupsOnSeparateLevels;
        });
      };


    });
});
