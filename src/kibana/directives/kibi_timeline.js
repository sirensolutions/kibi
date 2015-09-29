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
      var previousSearchSource;

      $scope.$watch('searchSource', function (newValue, oldValue) {

        var events = [];

        if (newValue === oldValue) return;

        if ($scope.searchSource) {

          previousSearchSource = $scope.searchSource;

          $scope.searchSource.onResults().then(function onResults(searchResp) {

            // Reset infinite scroll limit
            $scope.limit = 50;

            if ($scope.searchSource !== previousSearchSource) {
              return;
            }

            _.each(searchResp.hits.hits, function (hit) {
              events.push({
                start: new Date(hit._source[$scope.params.startField]),
                content: hit._source[$scope.params.labelField] || ''
              });
            });

            data = new vis.DataSet(events);

            if (timeline) {
              // clear and redraw the timeline
              timeline.destroy();
              timeline = new vis.Timeline($element[0], data, $scope.options);
            }
            else {
              timeline = new vis.Timeline($element[0], data, $scope.options);
            }

            // get the id of the clicked timeline item
            timeline.on('select', function (properties) {
              $scope.params.clickedItemId = properties.items;
            });

            return $scope.searchSource.onResults().then(onResults);

          }).catch(function (err) {
            // HERE WE HAVE TO DECIDE HOW TO HANDLE ERRORS
            console.log(err);
          });
        }

      });

    }

  });
});
