define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');

  require('modules').get('kibana').directive('kibiTimeline', function (Private, Notifier) {

    var filterManager = Private(require('components/filter_manager/filter_manager'));
    var notify = new Notifier({
      name: 'Kibi Timeline'
    });

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
        var selected = data._data[properties.items];

        if (selected) {
          var index = $scope.searchSource.get('index').id;
          var field = $scope.params.labelField;
          var value = selected.content;
          var operator = '+';

          filterManager.add(field, value, operator, index);
        }

      };

      $scope.$watch('options', function (newOptions, oldOptions) {
        if (!newOptions || newOptions === oldOptions) {
          return;
        }
        if (timeline) {
          timeline.setOptions(newOptions);
          timeline.redraw();
        }
      }, true); // has to be true in other way the change in height is not detected


      $scope.$watch('searchSource', function (newValue, oldValue) {

        if (newValue === oldValue && !!timeline) return;

        if ($scope.searchSource) {

          _previousSearchSource = $scope.searchSource;

          $scope.searchSource.onResults().then(function onResults(searchResp) {

            if ($scope.searchSource !== _previousSearchSource) {
              return;
            }

            var events = _.map(searchResp.hits.hits, function (hit) {
              var e =  {
                start: new Date(hit._source[$scope.params.startField]),
                content: hit._source[$scope.params.labelField] || ''
              };
              if ($scope.params.endField) {
                e.end = new Date(hit._source[$scope.params.endField]);
              }
              return e;
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
            notify.error(err);
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
