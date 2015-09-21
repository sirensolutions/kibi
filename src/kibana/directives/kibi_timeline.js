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
          options: '='
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

                // here I've just hardcoded that I'm taking the
                // pdate field
                // normaly which field to take wil come from the options
                console.log(searchResp.hits.hits);

                var events = [];
                _.each(searchResp.hits.hits, function (hit) {
                  events.push({
                    start: new Date(hit._source.pdate),
                    content: hit._source.pdate
                  });
                });

                var data = new vis.DataSet(events);
                timeline = new vis.Timeline($element[0], data, $scope.options);


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
