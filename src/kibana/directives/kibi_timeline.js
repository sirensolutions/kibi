define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');

  require('modules')
    .get('kibana')
    .directive('kibiTimeline', function () {

      var timeline;

      return {
        restrict: 'E',
        replace: true,
        scope: {
          searchSource: '=',
          options: '=',
          params: '='
        },
        link: function ($scope, $element) {

          var previousSearchSource;

          $scope.$watch('searchSource', function (searchSource) {
            if ($scope.searchSource) {

              previousSearchSource = $scope.searchSource;

              $scope.searchSource.onResults().then(function onResults(searchResp) {
                // Reset infinite scroll limit
                $scope.limit = 50;

                if ($scope.searchSource !== previousSearchSource) {
                  return;
                }

                // here I'm talking the startField name from params
                var events = [];
                _.each(searchResp.hits.hits, function (hit) {
                  events.push({
                    start: new Date(hit._source[$scope.params.startField]),
                    content: hit._source[$scope.params.startField]
                  });
                });

                var data = new vis.DataSet(events);
                if (timeline) {
                  timeline.redraw();
                } else {
                  timeline = new vis.Timeline($element[0], data, $scope.options);
                }

                return $scope.searchSource.onResults().then(onResults);
              }).catch(function (err) {
                // HERE WE HAVE TO DECIDE HOW TO HANDLE ERRORS
                console.log(err);
              });
            }
          });



        }
      };
    });
});
