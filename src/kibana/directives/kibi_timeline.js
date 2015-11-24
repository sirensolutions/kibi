define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');

  require('modules').get('kibana').directive('kibiTimeline', function (Private, Notifier, courier) {

    // color pallete borowed from d3
    var d3_category_20 = [
      '#1f77b4',
      '#aec7e8',
      '#ff7f0e',
      '#ffbb78',
      '#2ca02c',
      '#98df8a',
      '#d62728',
      '#ff9896',
      '#9467bd',
      '#c5b0d5',
      '#8c564b',
      '#c49c94',
      '#e377c2',
      '#f7b6d2',
      '#7f7f7f',
      '#c7c7c7',
      '#bcbd22',
      '#dbdb8d',
      '#17becf',
      '#9edae5'
    ];
    var filterManager = Private(require('components/filter_manager/filter_manager'));
    var notify = new Notifier({
      location: 'Kibi Timeline'
    });

    return {
      scope: {
        groups: '=',
        groupsOnSeparateLevels: '=',
        options: '=',
      },
      restrict: 'E',
      replace: true,
      link: _link
    };

    function _link($scope, $element) {
      var timeline;
      var _previousSearchSource;
      var data;

      var onSelect = function (properties) {
        // pass this to a scope variable
        var selected = data._data[properties.items];

        // for now it should be single object
        if (selected) {
          var index = selected.index;
          var field = selected.field;
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
        initTimeline();
        timeline.setOptions(newOptions);
        timeline.redraw();
      }, true); // has to be true in other way the change in height is not detected

      var groupEvents = [];

      var initTimeline = function () {
        if (!timeline) {
          // create a new one
          timeline = new vis.Timeline($element[0]);
          timeline.setOptions($scope.options);
          timeline.on('select', onSelect);
        }
      };

      var updateTimeline = function (groupIndex, events) {
        initTimeline();
        var existingGroupIds = _.map($scope.groups, function (g) {
          return g.id;
        });

        groupEvents[groupIndex] = _.cloneDeep(events);

        // make sure all events have correct group index
        // add only events from groups which still exists
        var points = [];
        _.each(groupEvents, function (events, index) {
          _.each(events, function (e) {
            e.group = $scope.groupsOnSeparateLevels === true ? index : 0;
            if (existingGroupIds.indexOf(e.groupId) !== -1) {
              points.push(e);
            }
          });
        });

        data = new vis.DataSet(points);
        timeline.setItems(data);
        timeline.fit();
      };

      var initSingleGroup = function (group, index) {
        var searchSource = group.searchSource;
        var params = group.params;
        var groupId = group.id;
        searchSource.onResults().then(function onResults(searchResp) {
          var events = [];

          if (params.startField) {
            var detectedMultivaluedLabel;
            var detectedMultivaluedStart;
            var detectedMultivaluedEnd;
            _.each(searchResp.hits.hits, function (hit) {
              if (hit._source[params.startField]) {

                if (_isMultivalued(hit._source, params.labelField)) {
                  detectedMultivaluedLabel = true;
                }
                if (_isMultivalued(hit._source, params.startField)) {
                  detectedMultivaluedStart = true;
                }
                var startValue = _pickFirstIfMultivalued(hit._source, params.startField);
                var e =  {
                  // index, field and content needed to create a filter on click
                  index: searchSource.get('index').id,
                  field: params.labelField,
                  content: _pickFirstIfMultivalued(hit._source, params.labelField, ''),

                  start: new Date(startValue),
                  type: 'box',
                  style: 'background-color: ' + d3_category_20[index] + '; color: #fff;',
                  group: $scope.groupsOnSeparateLevels === true ? index : 0,
                  groupId: groupId
                };

                if (params.endField) {
                  if (_isMultivalued(hit._source, params.endField)) {
                    detectedMultivaluedEnd = true;
                  }
                  if (!hit._source[params.endField]) {
                    // here the end field value missing but expected
                    // force the event to be of type point
                    e.type = 'point';
                  } else {
                    var endValue = _pickFirstIfMultivalued(hit._source, params.endField);
                    if (startValue === endValue) {
                      // also force it to be a point
                      e.type = 'point';
                    } else {
                      e.type = 'range';
                      e.end = new Date(endValue);
                    }
                  }
                }
                events.push(e);
              }
            });

            if (detectedMultivaluedLabel) {
              notify.warning('Label field [' + params.labelField + '] is multivalued - the first value will be used.');
            }
            if (detectedMultivaluedStart) {
              notify.warning('Start Date field [' + params.startField + '] is multivalued - the first date will be used.');
            }
            if (detectedMultivaluedEnd) {
              notify.warning('End Date field [' + params.endField + '] is multivalued - the first date will be used.');
            }

          }

          updateTimeline(index, events);

          return searchSource.onResults().then(onResults);

        }).catch(notify.error);
      };

      var initGroups = function () {
        initTimeline();
        var groups = [];
        if ($scope.groupsOnSeparateLevels === true) {
          _.each($scope.groups, function (group, index) {
            groups.push({
              id: index,
              content: group.label,
              style: 'background-color:' + d3_category_20[index] + '; color: #fff;'
            });
          });

        } else {
          // single group
          // - a bit of hack but currently the only way I could make it work
          groups.push({
            id: 0,
            content: '',
            style: 'background-color: none;'
          });
        }
        var dataGroups = new vis.DataSet(groups);
        timeline.setGroups(dataGroups);
      };


      $scope.$watch(
        function ($scope) {
          // here to make a comparison use all properties except a searchSource as it was causing angular to
          // enter an infinite loop when trying to determine the object equality
          var arr =  _.map($scope.groups, function (g) {
            return _.omit(g, 'searchSource');
          });

          arr.push($scope.groupsOnSeparateLevels);
          return arr;
        },
        function (newValue, oldValue) {
          if (newValue === oldValue) {
            return;
          }
          initTimeline();
          if ($scope.groups) {
            initGroups();
            // do not use newValue as it does not have searchSource as we filtered it out
            _.each($scope.groups, initSingleGroup);
            courier.fetch();
          }
        },
        true
      );


      $element.on('$destroy', function () {
        if (timeline) {
          timeline.off('select', onSelect);
        }
      });
    } // end of link function


  });
});
