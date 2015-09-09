define(function (require) {
  var _ = require('lodash');
  var module = require('modules').get('kibana');
  var template = require('text!components/filter_bar/filter_bar.html');
  var moment = require('moment');
  var jQuery = require('jquery');
  var qtip = require('qtip2');

  require('components/kibi/entity_clipboard/entity_clipboard');
  require('css!components/filter_bar/filter_bar.css');
  require('css!bower_components/qtip2/jquery.qtip.min.css');

  module.directive('filterBar', function (Private, Promise, getAppState, globalState, $timeout, indexPatterns) {
    var mapAndFlattenFilters = Private(require('components/filter_bar/lib/mapAndFlattenFilters'));
    var mapFlattenAndWrapFilters = Private(require('components/filter_bar/lib/mapFlattenAndWrapFilters'));
    var extractTimeFilter = Private(require('components/filter_bar/lib/extractTimeFilter'));
    var filterOutTimeBasedFilter = Private(require('components/filter_bar/lib/filterOutTimeBasedFilter'));
    var filterAppliedAndUnwrap = require('components/filter_bar/lib/filterAppliedAndUnwrap');
    var changeTimeFilter = Private(require('components/filter_bar/lib/changeTimeFilter'));
    var queryFilter = Private(require('components/filter_bar/query_filter'));

    var urlHelper   = Private(require('components/sindicetech/urlHelper/urlHelper'));

    return {
      restrict: 'E',
      template: template,
      scope: {},
      link: function ($scope, $el, attrs) {
        // bind query filter actions to the scope
        [
          'addFilters',
          'toggleFilter',
          'toggleAll',
          'pinFilter',
          'pinAll',
          'invertFilter',
          'invertAll',
          'removeFilter',
          'removeAll'
        ].forEach(function (method) {
          $scope[method] = queryFilter[method];
        });

        $scope.state = getAppState();

        $scope.applyFilters = function (filters) {
          // add new filters
          $scope.addFilters(filterAppliedAndUnwrap(filters));
          $scope.newFilters = [];

          // change time filter
          if ($scope.changeTimeFilter && $scope.changeTimeFilter.meta && $scope.changeTimeFilter.meta.apply) {
            changeTimeFilter($scope.changeTimeFilter);
          }
        };

        $scope.clearFilterBar = function () {
          $scope.newFilters = [];
          $scope.changeTimeFilter = null;
        };

        // update the scope filter list on filter changes
        $scope.$listen(queryFilter, 'update', function () {
          updateFilters();
        });

        // when appState changes, update scope's state
        $scope.$watch(getAppState, function (appState) {
          $scope.state = appState;
        });

        $scope.$watch('state.$newFilters', function (filters) {
          if (!filters) return;

          // If filters is not undefined and the length is greater than
          // one we need to set the newFilters attribute and allow the
          // users to decide what they want to apply.
          if (filters.length > 1) {
            return mapFlattenAndWrapFilters(filters)
            .then(function (results) {
              extractTimeFilter(results).then(function (filter) {
                $scope.changeTimeFilter = filter;
              });
              return results;
            })
            .then(filterOutTimeBasedFilter)
            .then(function (results) {
              $scope.newFilters = results;
            });
          }

          // Just add single filters to the state.
          if (filters.length === 1) {
            Promise.resolve(filters).then(function (filters) {
              extractTimeFilter(filters)
              .then(function (timeFilter) {
                if (timeFilter) changeTimeFilter(timeFilter);
              });
              return filters;
            })
            .then(filterOutTimeBasedFilter)
            .then($scope.addFilters);
          }
        });

        function updateFilters() {
          var filters = queryFilter.getFilters();
          mapAndFlattenFilters(filters).then(function (results) {
            // used to display the current filters in the state
            $scope.filters = _.sortBy(results, function (filter) {
              return !filter.meta.pinned;
            });
            jQuery('.qtip').qtip('destroy', true);
            $scope.$emit('filterbar:updated');
          });

          var promises = _.chain(filters)
          .filter(function (filter) {
            return !!filter.join;
          }).map(function (filter) {
            return filter.join.indexes;
          })
          .flatten()
          .map(function (index) {
            return indexPatterns.get(index.id);
          })
          .value();

          Promise.all(promises).then(function (data) {
            indexes = _.object(_.map(data, 'id'), data);
            $timeout(function () {
              jQuery('.filter.join').qtip({
                content: {
                  title: 'Relations',
                  text: jQuery('.filter.join .explanation').html()
                },
                position: {
                  my: 'top left',
                  at: 'bottom center'
                },
                style: {
                  classes: 'qtip-light qtip-rounded qtip-shadow'
                }
              });
            });
          });
        }

        // the set of index patterns
        var indexes;

        updateFilters();

        //needed by kibi to show filterbar when entityClipboard contains an entity
        var getShowEntityClipboard = function () {
          return !!globalState.entityURI && urlHelper.isItDashboardUrl();
        };
        $scope.showEntityClipboard = getShowEntityClipboard();
        globalState.on('save_with_changes', function () {
          $scope.showEntityClipboard = getShowEntityClipboard();
        });

        /**
         * Format the value as a date if the field type is date
         */
        function formatDate(fields, fieldName, value) {
          var field = _.find(fields, function (field) {
            return field.name === fieldName;
          });
          if (field.type === 'date') {
            return field.format.convert(value, 'html');
          }
          return value;
        }

        // needed by kibi to recreate filter label
        // as we do not want to store the meta info in filter join definition
        // we have to reqreate it
        // should support following filters
        // .query
        // .dbfilter
        // .geo_bounding_box
        // .range
        // .not
        // .or
        // .exists
        // .missing
        // .script
        $scope.recreateFilterLabel = function (f, indexId) {
          if (!indexes) {
            return '';
          }
          var fields = indexes[indexId].fields;
          var prop;
          if (f.query && f.query.query_string && f.query.query_string.query) {
            return 'query: <b>' + f.query.query_string.query + '</b> ';
          } else if (f.query && f.query.match) {
            var ret = '';
            for (var match in f.query.match) {
              if (f.query.match.hasOwnProperty(match)) {
                ret += ' ' + match + ': <b>' +  f.query.match[match].query + '</b> ';
              }
            }
            return ret;
          } else if (f.range) {
            prop = Object.keys(f.range)[0];
            return ' ' + prop + ': <b>' + formatDate(fields, prop, f.range[prop].gte) +
              '</b> to <b>' + formatDate(fields, prop, f.range[prop].lte) + '</b> ';
          } else if (f.dbfilter) {
            return ' ' + (f.dbfilter.negate ? 'NOT' : '') + ' dbfilter: <b>' + f.dbfilter.queryid + '</b> ';
          } else if (f.or) {
            return ' or filter <b>' + f.or.length + ' terms</b> ';
          } else if (f.exists) {
            prop = Object.keys(f.exists)[0];
            return ' exists: <b>' + prop + ':' + f.exists[prop] + '</b> ';
          } else if (f.script) {
            return ' script: script:<b>' + f.script.script + '</b> params: <b>' + f.script.params + '</b> ';
          } else if (f.missing) {
            prop = Object.keys(f.missing)[0];
            return ' missing: <b>' + prop + ':' + formatDate(fields, prop, f.missing[prop]) + '</b> ';
          } else if (f.not) {
            return ' NOT' + $scope.recreateFilterLabel(f.not);
          } else if (f.geo_bounding_box) {
            return ' location: top_left: ' +
                   ' lat: <b>' + f.geo_bounding_box.location.top_left.lat + '</b>' +
                   ' lon: <b>' + f.geo_bounding_box.location.top_left.lon + '</b>' +
                   ' bottom_right: ' +
                   ' lat: <b>' + f.geo_bounding_box.location.bottom_right.lat + '</b>' +
                   ' lon: <b>' + f.geo_bounding_box.location.bottom_right.lon + '</b> ';
          } else {
            return ' <b>Could not get filter label<b>';
          }
        };

      }
    };
  });
});
