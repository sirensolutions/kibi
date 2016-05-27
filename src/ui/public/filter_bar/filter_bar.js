define(function (require) {
  var _ = require('lodash');
  var module = require('ui/modules').get('kibana');
  var template = require('ui/filter_bar/filter_bar.html');
  var moment = require('moment');
  var angular = require('angular');

  require('ui/directives/json_input');

  require('ui/kibi/directives/kibi_entity_clipboard');

  module.directive('filterBar', function ($rootScope, Private, Promise, getAppState, globalState) {
    var joinExplain = Private(require('ui/filter_bar/join_explanation'));
    var mapAndFlattenFilters = Private(require('ui/filter_bar/lib/mapAndFlattenFilters'));
    var mapFlattenAndWrapFilters = Private(require('ui/filter_bar/lib/mapFlattenAndWrapFilters'));
    var extractTimeFilter = Private(require('ui/filter_bar/lib/extractTimeFilter'));
    var filterOutTimeBasedFilter = Private(require('ui/filter_bar/lib/filterOutTimeBasedFilter'));
    var filterAppliedAndUnwrap = require('ui/filter_bar/lib/filterAppliedAndUnwrap');
    var changeTimeFilter = Private(require('ui/filter_bar/lib/changeTimeFilter'));
    var queryFilter = Private(require('ui/filter_bar/query_filter'));
    var privateFilterFieldRegex = /(^\$|meta)/;
    var urlHelper   = Private(require('ui/kibi/helpers/url_helper'));
    var markFiltersBySelectedEntities = Private(require('ui/kibi/components/commons/_mark_filters_by_selected_entities'));

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
          'removeAll',
          'updateFilter'
        ].forEach(function (method) {
          $scope[method] = queryFilter[method];
        });

        $scope.state = getAppState();

        $scope.aceLoaded = function (editor) {
          editor.$blockScrolling = Infinity;
          var session = editor.getSession();
          session.setTabSize(2);
          session.setUseSoftTabs(true);
        };

        $scope.applyFilters = function (filters) {
          // add new filters
          $scope.addFilters(filterAppliedAndUnwrap(filters));
          $scope.newFilters = [];

          // change time filter
          if ($scope.changeTimeFilter && $scope.changeTimeFilter.meta && $scope.changeTimeFilter.meta.apply) {
            changeTimeFilter($scope.changeTimeFilter);
          }
        };

        $scope.startEditingFilter = function (source) {
          return $scope.editingFilter = {
            source: source,
            type: _.findKey(source, function (val, key) {
              return !key.match(privateFilterFieldRegex);
            }),
            model: convertToEditableFilter(source),
            alias: source.meta.alias
          };
        };

        $scope.stopEditingFilter = function () {
          $scope.editingFilter = null;
        };

        $scope.editDone = function () {
          $scope.updateFilter($scope.editingFilter);
          $scope.stopEditingFilter();
        };

        $scope.clearFilterBar = function () {
          $scope.newFilters = [];
          $scope.changeTimeFilter = null;
        };

        // update the scope filter list on filter changes
        $scope.$listen(queryFilter, 'update', function () {
          $scope.stopEditingFilter();
          updateFilters();
        });

        // when appState changes, update scope's state
        $scope.$watch(getAppState, function (appState) {
          $scope.state = appState;
        });

        /**
         * Watch the filters and if anything is added/removed then the count from the join_sequence filter alias is removed.
         * If left alone, the count would be misleading.
         */
        $scope.$watchCollection('state.filters', function (filters, oldFilters) {
          if (!filters || filters.length === (oldFilters && oldFilters.length || 0)) {
            return;
          }

          _.each($scope.state.filters, (filter) => {
            if (filter.join_sequence && filter.meta.alias_tmpl) {
              const base = filter.meta.alias.replace(/[0-9]+/, '');
              // make sure the alias was unchanged
              if (filter.meta.alias_tmpl.replace('$COUNT', '') === base) {
                filter.meta.alias = filter.meta.alias_tmpl.replace('$COUNT', '...');
                delete filter.meta.alias_tmpl;
              }
            }
          });
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

        function convertToEditableFilter(filter) {
          return _.omit(_.cloneDeep(filter), function (val, key) {
            return key.match(privateFilterFieldRegex);
          });
        }

        function updateFilters() {
          var filters = queryFilter.getFilters();

          var prevDependsOnSelectedEntitiesDisabled = new Promise((resolve, reject) => {
            resolve(_.map(filters, (filter) => filter.meta.dependsOnSelectedEntitiesDisabled));
          });
          var markFilters = prevDependsOnSelectedEntitiesDisabled.then(() => markFiltersBySelectedEntities(filters));

          mapAndFlattenFilters(filters).then(function (results) {
            // used to display the current filters in the state
            $scope.filters = _.sortBy(results, function (filter) {
              return !filter.meta.pinned;
            });
          })
          .then(function () {
            return joinExplain.getFilterExplanations(filters);
          })
          .then(function (explanations) {
            return joinExplain.initQtip(explanations);
          })
          // kibi: added by kibi to mark filters which depends on selected entities
          .then(() => Promise.all([
            prevDependsOnSelectedEntitiesDisabled,
            markFilters
          ]))
          // kibi: disable/enable filters that are dependent on the selected entity
          .then(([ prev, filters ]) => {
            _.each(filters, (filter, i) => {
              if (prev[i] !== filter.meta.dependsOnSelectedEntitiesDisabled &&
                  !filter.meta.disabled === filter.meta.dependsOnSelectedEntitiesDisabled) {
                $scope.toggleFilter(filter);
              }
            });
          })
          .then(function () {
            $scope.$emit('filterbar:updated');
          });
        }

        updateFilters();

        //needed by kibi to show filterbar when kibiEntityClipboard contains an entity
        var getShowKibiEntityClipboard = function () {
          return globalState.se && globalState.se.length > 0 && urlHelper.isItDashboardUrl();
        };
        $scope.showKibiEntityClipboard = getShowKibiEntityClipboard();
        var saveWithChangesHandler = function () {
          $scope.showKibiEntityClipboard = getShowKibiEntityClipboard();
        };
        globalState.on('save_with_changes', saveWithChangesHandler);

        // kibi: needed to recreate filter label.
        // as we do not want to store the meta info in filter join definition
        // we have to recreate it.
        // it should support the following filters:
        // .query
        // .dbfilter
        // .geo_bounding_box
        // .range
        // .not
        // .or
        // .exists
        // .missing
        // .script
        $scope.recreateFilterLabel = joinExplain.createLabel;

        var off1 = $rootScope.$on('kibi:entityURIEnabled', function (event, entityURIEnabled) {
          updateFilters();
        });
        var off2 = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
          updateFilters();
        });
        $scope.$on('$destroy', function () {
          off1();
          off2();
          globalState.off('save_with_changes', saveWithChangesHandler);
        });

      }
    };
  });
});
