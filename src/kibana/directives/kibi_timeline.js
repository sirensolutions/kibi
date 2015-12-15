define(function (require) {

  var _ = require('lodash');
  var vis = require('vis');
  var moment = require('moment');

  require('modules').get('kibana').directive('kibiTimeline', function (Private, Notifier, courier) {

    var color = Private(require('components/vislib/components/color/color'));
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
      var mapGroupIdToColor;
      var timeline;
      var data;

      var onSelect = function (properties) {
        // pass this to a scope variable
        var selected = data._data[properties.items];
        if (selected) {
          var index = selected.index;
          var field = selected.field;
          var value = selected.value;
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

        if (!newOptions || _.isEqual(newOptions, oldOptions)) {
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
          if ($scope.options) {
            timeline.setOptions($scope.options);
          }
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
                var indexId = searchSource.get('index').id;
                var startValue = _pickFirstIfMultivalued(hit._source, params.startField);
                var labelFieldValue = _pickFirstIfMultivalued(hit._source, params.labelField, '');
                var e =  {
                  // index, field and content needed to create a filter on click
                  index: indexId,
                  field: params.labelField,
                  value: labelFieldValue,
                  start: moment(startValue).toDate(),
                  type: 'box',
                  group: $scope.groupsOnSeparateLevels === true ? index : 0,
                  content: '<div title="Saved search: ' + group.savedSearchId + '">' +
                           '<span class="fa fa-circle"> <span style="color: #000">' + labelFieldValue + '</span>' +
                           '</div>',
                  style: 'border: none; background-color: #fff; color:' + mapGroupIdToColor(groupId) + ';',
                  groupId: groupId
                };

                if (params.endField) {
                  if (_isMultivalued(hit._source, params.endField)) {
                    detectedMultivaluedEnd = true;
                  }
                  if (hit._source[params.endField]) {
                    var endValue = _pickFirstIfMultivalued(hit._source, params.endField);
                    if (startValue !== endValue) {
                      e.type = 'range';
                      e.end = moment(endValue).toDate();
                      e.content = '<div title="Saved search: ' + group.savedSearchId + '">' +
                                  '<span>' + labelFieldValue + '</span>' +
                                  '</div>';
                      e.style = 'color: #fff; background-color: ' + mapGroupIdToColor(groupId) + ';';
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

        var groupIds = [];
        _.each($scope.groups, function (group) {
          groupIds.push(group.id);
        });
        if (groupIds.length === 0) {
          groupIds.push(0);  // 0 should always be there in case user switch to mixed mode
        }
        mapGroupIdToColor = color(groupIds);

        var groups = [];
        if ($scope.groupsOnSeparateLevels === true) {
          _.each($scope.groups, function (group, index) {
            groups.push({
              id: index,
              content: group.label,
              style: 'background-color:' + mapGroupIdToColor(group.id) + '; color: #fff;'
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
