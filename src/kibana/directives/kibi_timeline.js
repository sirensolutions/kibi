define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');

  require('modules').get('kibana').directive('kibiTimeline', function (Private, Notifier) {

    var filterManager = Private(require('components/filter_manager/filter_manager'));
    var notify = new Notifier({
      location: 'Kibi Timeline'
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

      var _isMultivalued = function (doc, field) {
        return doc[field] instanceof Array;
      };

      var _pickFirstIfMultivalued = function (doc, field, defaultValue) {
        if (!doc[field]) {
          return defaultValue || '';
        } else {
          if (_isMultivalued(doc, field) && doc[field].length > 0) {
            return doc[field][0];
          } else {
            return doc[field];
          }
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

            var events = [];
            if ($scope.params.startField) {
              var detectedMultivaluedLabel;
              var detectedMultivaluedStart;
              var detectedMultivaluedEnd;
              _.each(searchResp.hits.hits, function (hit) {
                if (hit._source[$scope.params.startField]) {

                  if (_isMultivalued(hit._source, $scope.params.labelField)) {
                    detectedMultivaluedLabel = true;
                  }
                  if (_isMultivalued(hit._source, $scope.params.startField)) {
                    detectedMultivaluedStart = true;
                  }
                  var e =  {
                    content: _pickFirstIfMultivalued(hit._source, $scope.params.labelField, ''),
                    start: new Date(_pickFirstIfMultivalued(hit._source, $scope.params.startField))
                  };
                  if ($scope.params.endField) {
                    if (_isMultivalued(hit._source, $scope.params.endField)) {
                      detectedMultivaluedEnd = true;
                    }
                    e.end = new Date(_pickFirstIfMultivalued(hit._source, $scope.params.endField));
                  }
                  events.push(e);
                }
              });

              if (detectedMultivaluedLabel) {
                notify.warning('Label field [' + $scope.params.labelField + '] is multivalued - the first value will be used.');
              }
              if (detectedMultivaluedStart) {
                notify.warning('Start Date field [' + $scope.params.startField + '] is multivalued - the first date will be used.');
              }
              if (detectedMultivaluedEnd) {
                notify.warning('End Date field [' + $scope.params.endField + '] is multivalued - the first date will be used.');
              }
            }

            data = new vis.DataSet(events);

            if (timeline) {
              // just update data points
              timeline.setItems(data);
              timeline.fit();
            } else {
              // create a new one
              timeline = new vis.Timeline($element[0], data, $scope.options);
              timeline.fit();
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
