define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');

  require('modules').get('kibana').directive('kibiTimeline', function () {

    return {
      scope: {
        searchSource: '=',
        options: '=',
        params: '='
      },
      restrict: 'E',
      replace: true,
      link: _link
    };

    function _link($scope, $element) {
      var data;
      var timeline;
      var _previousSearchSource;
      var onSelect = function (properties) {
        // pass this to a scope variable
        $scope.params.clickedItemId = data._data[properties.items];
        console.log('Selected timeline event', $scope.params.clickedItemId);
      };

      $scope.$watch('options', function (newOptions, oldOptions) {
        if (!newOptions || newOptions === oldOptions) {
          return;
        }
        if (timeline) {
          timeline.setOptions(newOptions);
        }
      });


      $scope.$watch('searchSource', function (newValue, oldValue) {

        if (newValue === oldValue) return;

        if ($scope.searchSource) {

          _previousSearchSource = $scope.searchSource;

          $scope.searchSource.onResults().then(function onResults(searchResp) {

            if ($scope.searchSource !== _previousSearchSource) {
              return;
            }

            var events = _.map(searchResp.hits.hits, function (hit) {
              return {
                start: new Date(hit._source[$scope.params.startField]),
                content: hit._source[$scope.params.labelField] || ''
              };
            });

            data = new vis.DataSet(events);

            if (timeline) {
              // just update data points
              timeline.setItems(data);
            } else {
              // create a new one
              timeline = new vis.Timeline($element[0], data, $scope.options);
              timeline.on('select', onSelect);
            }

            return $scope.searchSource.onResults().then(onResults);

          }).catch(function (err) {
            // HERE WE HAVE TO DECIDE HOW TO HANDLE ERRORS
            console.log(err);
          });
        }

        $element.on('$destroy', function () {
          if (timeline) {
            timeline.off('select', onSelect);
          }
        });

      });

    }

  });
});
