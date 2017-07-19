define(function (require) {
  const _ = require('lodash');
  const $ = require('jquery');
  const angular = require('angular');
  const ConfigTemplate = require('ui/ConfigTemplate');
  const chrome = require('ui/chrome');
  const stateMonitorFactory = require('ui/state_management/state_monitor_factory');
  const kibiUtils = require('kibiutils');

  require('ui/directives/config');
  require('ui/courier');
  require('ui/config');
  require('ui/notify');
  require('ui/typeahead');
  require('ui/navbar_extensions');
  require('ui/share');

  require('plugins/kibana/dashboard/directives/grid');
  require('plugins/kibana/dashboard/components/panel/panel');
  require('plugins/kibana/dashboard/services/saved_dashboards');
  require('plugins/kibana/dashboard/styles/main.less');

  require('ui/saved_objects/saved_object_registry').register(require('plugins/kibana/dashboard/services/saved_dashboard_register'));
  require('ui/kibi/directives/kibi_select'); // kibi: added as it is needed by src/plugins/kibana/public/dashboard/partials/save_dashboard.html
  require('ui/kibi/session/siren_session'); // kibi: added to make sirenSession service available
  // kibi: end

  const app = require('ui/modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/courier',
    'kibana/config',
    'kibana/notify',
    'kibana/typeahead'
  ]);

  require('ui/routes')
  .when('/dashboard', {
    template: require('plugins/kibana/dashboard/index.html'),
    resolve: {
      dash: function (timefilter, savedDashboards, courier, config) {
        // kibi:
        // - get all the dashboards
        // - if none, just create a new one
        // - if any try to load the default dashboard if set, otherwise load the first dashboard
        // - if the default dashboard is missing, load the first dashboard
        // - if the first dashboard is missing, create a new one
        const defDashConfig = config.get('kibi:defaultDashboardTitle');
        return savedDashboards.find().then(function (resp) {
          if (resp.hits.length) {
            timefilter.enabled = true;
            // kibi: select the first dashboard if default_dashboard_title is not set
            let dashboardId = resp.hits[0].id;
            let redirectToWhenMissing = '/dashboard/new-dashboard/create/';
            if (defDashConfig) {
              dashboardId = defDashConfig;
              redirectToWhenMissing = `/dashboard/${resp.hits[0].id}`;
            }
            return savedDashboards.get(dashboardId).catch(err => {
              if (defDashConfig) {
                err.message = `The default dashboard with id "${defDashConfig}" does not exist.
                  Please correct the "kibi:defaultDashboardTitle" parameter in advanced settings`;
              }
              return courier.redirectWhenMissing({
                dashboard : redirectToWhenMissing
              })(err);
            });
          }
          return savedDashboards.get();
        });
      }
    }
  })
  .when('/dashboard/:id', {
    template: require('plugins/kibana/dashboard/index.html'),
    resolve: {
      dash: function (timefilter, savedDashboards, Notifier, $route, courier) {
        // kibi: show the timepicker when loading a dashboard
        timefilter.enabled = true;
        return savedDashboards.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          dashboard : '/dashboard'
        }));
      }
    }
  })
  // kibi: this path is used to show an empty dashboard when creating a new one
  .when('/dashboard/new-dashboard/create/', {
    template: require('plugins/kibana/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards) {
        return savedDashboards.get();
      }
    }
  });

  app.directive('dashboardApp', function (courier, AppState, timefilter, kbnUrl, createNotifier) {
    return {
      controllerAs: 'dashboardApp',
      controller: function (config, kibiState, globalState, $scope, $rootScope, $route, $location, $routeParams, Private, getAppState) {

        const queryFilter = Private(require('ui/filter_bar/query_filter'));
        const getEmptyQueryOptionHelper = Private(require('ui/kibi/helpers/get_empty_query_with_options_helper'));

        const notify = createNotifier({
          location: 'Dashboard'
        });

        const dash = $scope.dash = $route.current.locals.dash;

        const dashboardTime = kibiState._getDashboardProperty(dash.id, kibiState._properties.time);
        if (dashboardTime) {
          // kibi: time from the kibi state.
          // this allows to set a time (not save it with a dashboard), switch between dashboards, and
          // still retain the time set until the app is reloaded
          timefilter.time.mode = dashboardTime.m;
          timefilter.time.from = dashboardTime.f;
          timefilter.time.to = dashboardTime.t;
        } else if (dash.timeRestore && dash.timeTo && dash.timeFrom && !getAppState.previouslyStored()) {
          // time saved with the dashboard
          timefilter.time.mode = dash.timeMode;
          timefilter.time.to = dash.timeTo;
          timefilter.time.from = dash.timeFrom;
        } else {
          // default time
          const timeDefaults = config.get('timepicker:timeDefaults');
          timefilter.time.mode = timeDefaults.mode;
          timefilter.time.to = timeDefaults.to;
          timefilter.time.from = timeDefaults.from;
        }

        // kibi: below listener on globalState is needed to react when the global time is changed by the user
        // either directly in time widget or by clicking on histogram chart etc
        const saveWithChangesHandler = function (diff) {
          if (dash.id && diff.indexOf('time') !== -1 && timefilter.time.from && timefilter.time.to &&
              !kibiState._isDefaultTime(timefilter.time.mode, timefilter.time.from, timefilter.time.to)) {
            kibiState._saveTimeForDashboardId(dash.id, timefilter.time.mode, timefilter.time.from, timefilter.time.to);
            kibiState.save();
          }
        };
        globalState.on('save_with_changes', saveWithChangesHandler);

        const matchQueryFilter = function (filter) {
          return filter.query && filter.query.query_string && !filter.meta;
        };

        const extractQueryFromFilters = function (filters) {
          const filter = _.find(filters, matchQueryFilter);
          if (filter) return filter.query;
        };

        // kibi: get the filters and query from the kibi state
        const dashboardQuery = kibiState._getDashboardProperty(dash.id, kibiState._properties.query);
        // do not take pinned filters !
        const dashboardFilters = kibiState._getDashboardProperty(dash.id, kibiState._properties.filters);

        const stateDefaults = {
          id: dash.id, // kibi: added to identity a dashboard in helper methods
          title: dash.title,
          panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [],
          options: dash.optionsJSON ? JSON.parse(dash.optionsJSON) : {},
          uiState: dash.uiStateJSON ? JSON.parse(dash.uiStateJSON) : {},
          // kibi: get the query from the kibi state, and if unset get the one the searchsource
          query: dashboardQuery || extractQueryFromFilters(dash.searchSource.getOwn('filter')) || getEmptyQueryOptionHelper.getQuery(),
          // kibi: get the filters from the kibi state, and if unset get the one the searchsource
          filters: dashboardFilters || _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter)
        };

        let stateMonitor;
        const $appStatus = this.appStatus = $scope.appStatus = {};
        const $state = $scope.state = new AppState(stateDefaults);
        const $uiState = $scope.uiState = $state.makeStateful('uiState');

        // kibi: added so the kibi-dashboard-toolbar which was moved out could comunicate with the main app
        const stDashboardInvokeMethodOff = $rootScope.$on('kibi:dashboard:invoke-method', function (event, methodName) {
          $scope[methodName]();
        });
        const stDashboardSetProperty = $rootScope.$on('kibi:dashboard:set-property', function (event, property, data) {
          $scope[property] = data;
        });

        $scope.$watch('configTemplate', function () {
          $rootScope.$emit('stDashboardOnProperty', 'configTemplate', $scope.configTemplate);
        }, true);

        $scope.$on('$destroy', function () {
          // kibi: remove the listener on globalstate
          globalState.off('save_with_changes', saveWithChangesHandler);
          dash.destroy();
          stDashboardInvokeMethodOff();
          stDashboardSetProperty();
        });
        // kibi: end


        $scope.$watchCollection('state.options', function (newVal, oldVal) {
          if (!angular.equals(newVal, oldVal)) $state.save();
        });
        $scope.$watch('state.options.darkTheme', setDarkTheme);

        $scope.configTemplate = new ConfigTemplate({
          save: require('plugins/kibana/dashboard/partials/save_dashboard.html'),
          load: require('plugins/kibana/dashboard/partials/load_dashboard.html'),
          share: require('plugins/kibana/dashboard/partials/share.html'),
          pickVis: require('plugins/kibana/dashboard/partials/pick_visualization.html'),
          options: require('plugins/kibana/dashboard/partials/options.html')
        });

        $scope.refresh = _.bindKey(courier, 'fetch');

        $scope.timefilter = timefilter;
        $scope.$listen(timefilter, 'fetch', $scope.refresh);

        courier.setRootSearchSource(dash.searchSource);

        function init() {
          updateQueryOnRootSource();

          const docTitle = Private(require('ui/doc_title'));
          if (dash.id) {
            docTitle.change(dash.title);
          }

          initPanelIndices();

          // watch for state changes and update the appStatus.dirty value
          stateMonitor = stateMonitorFactory.create($state, stateDefaults);
          stateMonitor.onChange((status) => {
            $rootScope.$emit('stDashboardOnProperty', 'state', $scope.state);
            $appStatus.dirty = status.dirty;
          });
          $scope.$on('$destroy', () => stateMonitor.destroy());

          $scope.$emit('application.load');
        }

        function initPanelIndices() {
          // find the largest panelIndex in all the panels
          let maxIndex = getMaxPanelIndex();

          // ensure that all panels have a panelIndex
          $scope.state.panels.forEach(function (panel) {
            if (!panel.panelIndex) {
              panel.panelIndex = maxIndex++;
            }
          });
        }

        function getMaxPanelIndex() {
          let index = $scope.state.panels.reduce(function (idx, panel) {
            // if panel is missing an index, add one and increment the index
            return Math.max(idx, panel.panelIndex || idx);
          }, 0);
          return ++index;
        }

        function updateQueryOnRootSource() {
          const filters = queryFilter.getFilters();
          if ($state.query) {
            dash.searchSource.set('filter', _.union(filters, [{
              query: $state.query
            }]));
          } else {
            dash.searchSource.set('filter', filters);
          }
        }

        function setDarkTheme(enabled) {
          const theme = Boolean(enabled) ? 'theme-dark' : 'theme-light';
          chrome.removeApplicationClass(['theme-dark', 'theme-light']);
          chrome.addApplicationClass(theme);
        }

        // update root source on kibiState reset
        $scope.$listen(kibiState, 'reset_app_state_query', function () {
          updateQueryOnRootSource();
          $state.save();
          $scope.refresh();
        });

        // update root source when filters update
        $scope.$listen(queryFilter, 'update', function () {
          updateQueryOnRootSource();
          $state.save();
        });

        // update data when filters fire fetch event
        $scope.$listen(queryFilter, 'fetch', $scope.refresh);

        $scope.newDashboard = function () {
          // kibi: changed from '/dashboard' because now there's a specific path for dashboard creation
          kbnUrl.change('/dashboard/new-dashboard/create', {});
        };

        $scope.filterResults = function () {
          updateQueryOnRootSource();
          $state.save();
          $scope.refresh();
        };

        $scope.save = function () {
          // kibi: lock the dashboard so kibi_state._getCurrentDashboardId ignore the change for a moment
          dash.locked = true;

          const previousDashId = dash.id;
          $state.title = dash.id = dash.title;
          $state.save();

          dash.panelsJSON = angular.toJson($state.panels);
          dash.uiStateJSON = angular.toJson($uiState.getChanges());
          // kibi: save the timepicker mode
          dash.timeMode = dash.timeRestore ? timefilter.time.mode : undefined;
          dash.timeFrom = dash.timeRestore ? timefilter.time.from : undefined;
          dash.timeTo = dash.timeRestore ? timefilter.time.to : undefined;
          dash.optionsJSON = angular.toJson($state.options);

          dash.save()
          .then(function (id) {
            delete dash.locked; // kibi: our lock for the dashboard!
            stateMonitor.setInitialState($state.toJSON());
            $scope.configTemplate.close('save');
            if (id) {
              notify.info('Saved Dashboard as "' + dash.title + '"');
              $rootScope.$emit('kibi:dashboard:changed', id); // kibi: added by kibi
              if (dash.id !== $routeParams.id) {
                kbnUrl.change('/dashboard/{{id}}', {id: dash.id});
              }
            }
          })
          .catch((err) => {
            // kibi: if the dashboard can't be saved rollback the dashboard id
            dash.id = previousDashId;
            delete dash.locked; // kibi: our lock for the dashboard!
            $scope.configTemplate.close('save');
            notify.error(err);
            // kibi: end
          });
        };

        let pendingVis = _.size($state.panels);
        $scope.$on('ready:vis', function () {
          if (pendingVis) pendingVis--;
          if (pendingVis === 0) {
            $state.save();
            $scope.refresh();
          }
        });

        // listen for notifications from the grid component that changes have
        // been made, rather than watching the panels deeply
        $scope.$on('change:vis', function () {
          $state.save();
        });

        // called by the saved-object-finder when a user clicks a vis
        $scope.addVis = function (hit) {
          pendingVis++;
          $state.panels.push({ id: hit.id, type: 'visualization', panelIndex: getMaxPanelIndex() });
        };

        $scope.addSearch = function (hit) {
          pendingVis++;
          $state.panels.push({ id: hit.id, type: 'search', panelIndex: getMaxPanelIndex() });
        };

        // Setup configurable values for config directive, after objects are initialized
        $scope.opts = {
          dashboard: dash,
          ui: $state.options,
          save: $scope.save,
          addVis: $scope.addVis,
          addSearch: $scope.addSearch
        };

        // kibi: If you click the back/forward browser button:
        // 1. The $locationChangeSuccess event is fired when you click back/forward browser button.
        $rootScope.$on('$locationChangeSuccess', () => $rootScope.actualLocation = $location.url());
        // 2. The following watcher is fired.
        $rootScope.$watch(() => { return $location.url(); }, (newLocation, oldLocation) => {
          if ($rootScope.actualLocation === newLocation) {
            /* kibi: Here we execute init() if the newLocation is equal to the URL we saved during
               the $locationChangeSuccess event above. */
            init();
          }
        });
        /* kibi: If you click an ordinary hyperlink, the above order is reversed.
           First, you have the watcher fired, then the $locationChangeSuccess event.
           That's why the actualLocation and newLocation will never be equal inside the watcher callback
           if you click on an ordinary hyperlink. */

        init();
      }
    };
  });
});
