define(function (require) {
  const _ = require('lodash');
  const module = require('ui/modules').get('kibana');
  const template = require('ui/filter_bar/filter_bar.html');
  const moment = require('moment');
  const angular = require('angular');

  require('ui/directives/json_input');

  require('ui/kibi/directives/kibi_entity_clipboard');

  require('ui/kibi/styles/explanation');

  module.directive('filterBar', function (createNotifier, kibiState, $rootScope, Private, Promise, getAppState, config) {
    const mapAndFlattenFilters = Private(require('ui/filter_bar/lib/mapAndFlattenFilters'));
    const mapFlattenAndWrapFilters = Private(require('ui/filter_bar/lib/mapFlattenAndWrapFilters'));
    const extractTimeFilter = Private(require('ui/filter_bar/lib/extractTimeFilter'));
    const filterOutTimeBasedFilter = Private(require('ui/filter_bar/lib/filterOutTimeBasedFilter'));
    const filterAppliedAndUnwrap = require('ui/filter_bar/lib/filterAppliedAndUnwrap');
    const changeTimeFilter = Private(require('ui/filter_bar/lib/changeTimeFilter'));
    const queryFilter = Private(require('ui/filter_bar/query_filter'));
    const privateFilterFieldRegex = /(^\$|meta)/;
    // kibi: added some helpers
    const joinExplain = Private(require('ui/filter_bar/join_explanation'));
    const markFiltersBySelectedEntities = Private(require('ui/kibi/components/commons/_mark_filters_by_selected_entities'));
    const urlHelper = Private(require('ui/kibi/helpers/url_helper'));

    const notify = createNotifier({
      name: 'Kibi Navigation Bar'
    });

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
          const session = editor.getSession();
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
          const filters = queryFilter.getFilters();

          const prevDependsOnSelectedEntitiesDisabled = Promise.resolve(
            _.map(filters, (filter) => filter.meta.dependsOnSelectedEntitiesDisabled)
          );
          const markFilters = prevDependsOnSelectedEntitiesDisabled.then(() => markFiltersBySelectedEntities(filters));

          return mapAndFlattenFilters(filters).then(function (results) {
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
              if (prev[i] !== undefined && prev[i] !== filter.meta.dependsOnSelectedEntitiesDisabled &&
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

        // kibi: Get the state for the dashboard ID and add the join_set filter to the appState if it exists
        const addJoinSetFilter = function (dashboardId) {
          return kibiState.getState(dashboardId).then(({ filters }) => {
            if ($scope.state && $scope.state.filters) {
              _.remove($scope.state.filters, (f) => f.join_set);
            }
            _.each(filters, (filter) => {
              if (filter.join_set) {
                queryFilter.addFilters(filter);
                return false;
              }
            });
          }).catch(notify.error);
        };

        // kibi: add join_set on relationPanel event
        const addJoinSetFilterOnRelationalPanel = function (panelEnabled) {
          const currentDashboardId = kibiState._getCurrentDashboardId();
          if (currentDashboardId && panelEnabled) {
            addJoinSetFilter(currentDashboardId);
          }
        };
        const relationalPanelListenerOff = $rootScope.$on('change:config.kibi:relationalPanel', function (event, panelEnabled) {
          addJoinSetFilterOnRelationalPanel(panelEnabled);
        });
        addJoinSetFilterOnRelationalPanel(config.get('kibi:relationalPanel'));

        // kibi: needed to show filterbar when kibiEntityClipboard contains an entity
        $scope.showKibiEntityClipboard = urlHelper.onDashboardTab() && Boolean(kibiState.getEntityURI());

        // kibi: listen to changes to the kibiState
        $scope.$listen(kibiState, 'save_with_changes', (diff) => {
          const currentDashboardId = kibiState._getCurrentDashboardId();

          if (!currentDashboardId) {
            $scope.showKibiEntityClipboard = false;
            return;
          }

          let promise = Promise.resolve();

          // add join_set on kibiState save event
          if (diff.indexOf(kibiState._properties.enabled_relations) !== -1) {
            promise = addJoinSetFilter(currentDashboardId);
          }
          // the selected entity changed
          if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
              diff.indexOf(kibiState._properties.selected_entity_disabled) !== -1) {
            $scope.showKibiEntityClipboard = Boolean(kibiState.getEntityURI());
            promise.then(() => updateFilters.call(this)).catch(notify.error);
          }
        });

        $scope.$on('$destroy', function () {
          relationalPanelListenerOff();
        });

      }
    };
  });
});
