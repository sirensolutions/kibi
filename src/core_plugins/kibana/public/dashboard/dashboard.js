import _ from 'lodash';
import angular from 'angular';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';

import 'plugins/kibana/dashboard/grid';
import 'plugins/kibana/dashboard/panel/panel';

import { SavedObjectNotFound } from 'ui/errors';
import { getDashboardTitle, getUnsavedChangesWarningMessage } from './dashboard_strings';
import { DashboardViewMode } from './dashboard_view_mode';
import { TopNavIds } from './top_nav/top_nav_ids';
import { ConfirmationButtonTypes } from 'ui/modals/confirm_modal';
import dashboardTemplate from 'plugins/kibana/dashboard/dashboard.html';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import DocTitleProvider from 'ui/doc_title';
import { getTopNavConfig } from './top_nav/get_top_nav_config';
import { DashboardConstants, createDashboardEditUrl } from './dashboard_constants';
import { VisualizeConstants } from 'plugins/kibana/visualize/visualize_constants';
import UtilsBrushEventProvider from 'ui/utils/brush_event';
import FilterBarFilterBarClickHandlerProvider from 'ui/filter_bar/filter_bar_click_handler';
// kibi: need to call private on dashboard_state
import DashboardStateProvider from './dashboard_state';
import notify from 'ui/notify';

// kibi: imports
import { hashedItemStoreSingleton } from 'ui/state_management/state_storage';
// kibi: end

const app = uiModules.get('app/dashboard', [
  'elasticsearch',
  'ngRoute',
  'kibana/courier',
  'kibana/config',
  'kibana/notify',
  'kibana/typeahead'
]);

uiRoutes
  .when(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, courier) {
        return savedDashboards.get()
          .catch(courier.redirectWhenMissing({
            'dashboard': DashboardConstants.LANDING_PAGE_PATH
          }));
      }
    }
  })
  .when(createDashboardEditUrl(':id'), {
    template: dashboardTemplate,
    resolve: {
      dash: function (savedDashboards, $route, courier) {
        const id = $route.current.params.id;
        return savedDashboards.get(id)
        .catch(courier.redirectWhenMissing({
          'dashboard' : DashboardConstants.LANDING_PAGE_PATH
        }));
      }
    }
  });

app.directive('dashboardApp', function (createNotifier, courier, AppState, timefilter, quickRanges, kbnUrl, confirmModal, Private) {
  const brushEvent = Private(UtilsBrushEventProvider);
  const filterBarClickHandler = Private(FilterBarFilterBarClickHandlerProvider);

  return {
    restrict: 'E',
    controllerAs: 'dashboardApp',
    controller: function ($scope, $rootScope, $route, $routeParams, $location, Private, getAppState,
      // kibi: added dashboardGroups, kibiState, config
      dashboardGroups, kibiState, config) {
      const filterBar = Private(FilterBarQueryFilterProvider);
      const docTitle = Private(DocTitleProvider);
      const notify = createNotifier({ location: 'Dashboard' });

      const dash = $scope.dash = $route.current.locals.dash;
      if (dash.id) {
        docTitle.change(dash.title);
      }

      // kibi: adds information about the group membership and stats
      const numeral = require('numeral')();
      function getMetadata() {
        delete dash.group;
        if (dash.id) {
          dash.group = dashboardGroups.getGroup(dash.id);
          if (dash.group) {
            const count = _(dash.group.dashboards).filter(d => d.id === dash.id).map('count').value();
            if (count && count.length) {
              dash.formattedCount = count[0];
              if (_.isNumber(count[0])) {
                dash.formattedCount = numeral.set(count[0]).format('0,0');
              }
            }
          }
        }
      }
      dashboardGroups.on('groupsMetadataUpdated', () => {
        getMetadata();
      }).on('dashboardsMetadataUpdated', () => {
        getMetadata();
      });
      getMetadata();
      // kibi: end

      // kibi: get the DashboardState class
      const DashboardState = Private(DashboardStateProvider);
      const dashboardState = new DashboardState(dash, AppState);

      // kibi: time from the kibi state.
      const dashboardTime = kibiState._getDashboardProperty(dash.id, kibiState._properties.time);
      if (dashboardTime) {
        // this allows to set a time (not save it with a dashboard), switch between dashboards, and
        // still retain the time set until the app is reloaded
        timefilter.time.mode = dashboardTime.m;
        timefilter.time.from = dashboardTime.f;
        timefilter.time.to = dashboardTime.t;
        if (dash.refreshInterval) {
          timefilter.refreshInterval = dash.refreshInterval;
        }
      }
      // The 'previouslyStored' check is so we only update the time filter on dashboard open, not during
      // normal cross app navigation.
      else if (!getAppState.previouslyStored()) {
        if (dashboardState.getIsTimeSavedWithDashboard()) {
          dashboardState.syncTimefilterWithDashboard(timefilter, quickRanges);
        }
        else {
          // kibi: set default time
          const { mode, from, to } = config.get('timepicker:timeDefaults');
          timefilter.time.mode = mode;
          timefilter.time.to = to;
          timefilter.time.from = from;
        }
      }

      // Part of the exposed plugin API - do not remove without careful consideration.
      this.appStatus = {
        dirty: !dash.id
      };
      dashboardState.stateMonitor.onChange(status => {
        this.appStatus.dirty = status.dirty || !dash.id;
      });

      dashboardState.applyFilters(dashboardState.getQuery(), filterBar.getFilters());
      let pendingVisCount = _.size(dashboardState.getPanels());

      timefilter.enabled = true;
      dash.searchSource.highlightAll(true);
      dash.searchSource.version(true);
      courier.setRootSearchSource(dash.searchSource);

      // Following the "best practice" of always have a '.' in your ng-models –
      // https://github.com/angular/angular.js/wiki/Understanding-Scopes
      $scope.model = {
        hideBorders: dashboardState.getHideBorders(), // kibi: toggle borders around panels
        query: dashboardState.getQuery(),
        darkTheme: dashboardState.getDarkTheme(),
        timeRestore: dashboardState.getTimeRestore(),
        title: dashboardState.getTitle()
      };

      $scope.panels = dashboardState.getPanels();
      $scope.refresh = (...args) => {
        $rootScope.$broadcast('fetch');
        courier.fetch(...args);
      };
      $scope.timefilter = timefilter;
      $scope.expandedPanel = null;
      $scope.dashboardViewMode = dashboardState.getViewMode();

      $scope.landingPageUrl = () => `#${DashboardConstants.LANDING_PAGE_PATH}`;
      $scope.listingPageUrl = () => `#${DashboardConstants.LISTING_PAGE_PATH}`; // kibi: expose listing page path
      $scope.getBrushEvent = () => brushEvent(dashboardState.getAppState());
      $scope.getFilterBarClickHandler = () => filterBarClickHandler(dashboardState.getAppState());
      $scope.hasExpandedPanel = () => $scope.expandedPanel !== null;
      $scope.getDashTitle = () => getDashboardTitle(
        dashboardState.getTitle(),
        dashboardState.getViewMode(),
        dashboardState.getIsDirty(timefilter));
      $scope.newDashboard = () => { kbnUrl.change(DashboardConstants.CREATE_NEW_DASHBOARD_URL, {}); };
      $scope.saveState = () => dashboardState.saveState();
      $scope.getShouldShowEditHelp = () => !dashboardState.getPanels().length && dashboardState.getIsEditMode();
      $scope.getShouldShowViewHelp = () => !dashboardState.getPanels().length && dashboardState.getIsViewMode();

      $scope.toggleExpandPanel = (panelIndex) => {
        if ($scope.expandedPanel && $scope.expandedPanel.panelIndex === panelIndex) {
          $scope.expandedPanel = null;
        } else {
          $scope.expandedPanel =
            dashboardState.getPanels().find((panel) => panel.panelIndex === panelIndex);
        }
      };

      $scope.filterResults = function () {
        dashboardState.applyFilters($scope.model.query, filterBar.getFilters());
        $scope.refresh();
      };

      // called by the saved-object-finder when a user clicks a vis
      $scope.addVis = function (hit) {
        pendingVisCount++;
        dashboardState.addNewPanel(hit.id, 'visualization');
        notify.info(`Visualization successfully added to your dashboard`);
      };

      $scope.addSearch = function (hit) {
        pendingVisCount++;
        dashboardState.addNewPanel(hit.id, 'search');
        notify.info(`Search successfully added to your dashboard`);
      };

      /**
       * Creates a child ui state for the panel. It's passed the ui state to use, but needs to
       * be generated from the parent (why, I don't know yet).
       * @param path {String} - the unique path for this ui state.
       * @param uiState {Object} - the uiState for the child.
       * @returns {Object}
       */
      $scope.createChildUiState = function createChildUiState(path, uiState) {
        return dashboardState.uiState.createChild(path, uiState, true);
      };

      $scope.onPanelRemoved = (panelIndex) => dashboardState.removePanel(panelIndex);

      $scope.$watch('model.darkTheme', () => {
        dashboardState.setDarkTheme($scope.model.darkTheme);
        updateTheme();
      });
      $scope.$watch('model.hideBorders', () => dashboardState.setHideBorders($scope.model.hideBorders));
      $scope.$watch('model.title', () => dashboardState.setTitle($scope.model.title));
      $scope.$watch('model.timeRestore', () => dashboardState.setTimeRestore($scope.model.timeRestore));

      $scope.$listen(timefilter, 'fetch', () => {
        // kibi: the listener below is needed to react when the global time is changed by the user
        // either directly in time widget or by clicking on histogram chart etc
        const { mode, from, to } = timefilter.time;
        if (dash.id && !kibiState._isDefaultTime(mode, from, to)) {
          kibiState._saveTimeForDashboardId(dash.id, mode, from, to);
          kibiState.save();
        }
        // kibi: end
        $scope.refresh();
      });

      function updateViewMode(newMode) {
        $scope.topNavMenu = getTopNavConfig(newMode, navActions); // eslint-disable-line no-use-before-define
        dashboardState.switchViewMode(newMode);
        $scope.dashboardViewMode = newMode;
      }

      const onChangeViewMode = (newMode) => {
        const isPageRefresh = newMode === dashboardState.getViewMode();
        const isLeavingEditMode = !isPageRefresh && newMode === DashboardViewMode.VIEW;
        const willLoseChanges = isLeavingEditMode && dashboardState.getIsDirty(timefilter);

        if (!willLoseChanges) {
          updateViewMode(newMode);
          return;
        }

        function revertChangesAndExitEditMode() {
          dashboardState.resetState();

          // kibi: Ensure dashboard counts update on exiting edit mode
          if (dash.id) {
            dashboardGroups.selectDashboard(dash.id);
          } else {
            kbnUrl.change(DashboardConstants.CREATE_NEW_DASHBOARD_URL);
          }
          // kibi: end

          // This is only necessary for new dashboards, which will default to Edit mode.
          updateViewMode(DashboardViewMode.VIEW);

          // We need to do a hard reset of the timepicker. appState will not reload like
          // it does on 'open' because it's been saved to the url and the getAppState.previouslyStored() check on
          // reload will cause it not to sync.
          if (dashboardState.getIsTimeSavedWithDashboard()) {
            dashboardState.syncTimefilterWithDashboard(timefilter, quickRanges);
          }
        }

        confirmModal(
          getUnsavedChangesWarningMessage(dashboardState.getChangedFilterTypes(timefilter)),
          {
            onConfirm: revertChangesAndExitEditMode,
            onCancel: _.noop,
            confirmButtonText: 'Yes, lose changes',
            cancelButtonText: 'No, keep working',
            defaultFocusedButton: ConfirmationButtonTypes.CANCEL
          }
        );
      };

      const navActions = {};
      navActions[TopNavIds.EXIT_EDIT_MODE] = () => onChangeViewMode(DashboardViewMode.VIEW);
      navActions[TopNavIds.ENTER_EDIT_MODE] = () => onChangeViewMode(DashboardViewMode.EDIT);

      updateViewMode(dashboardState.getViewMode());

      $scope.save = function () {
        return dashboardState.saveDashboard(angular.toJson, timefilter).then(function (id) {
          $scope.kbnTopNav.close('save');
          if (id) {
            notify.info(`Saved Dashboard as "${dash.title}"`);
            $rootScope.$emit('kibi:dashboard:changed', id); // kibi: allow helpers to react to dashboard changes
            if (dash.id !== $routeParams.id) {
              kbnUrl.change(createDashboardEditUrl(dash.id));
            } else {
              docTitle.change(dash.lastSavedTitle);
              updateViewMode(DashboardViewMode.VIEW);
            }
          }
        }).catch(notify.fatal);
      };

      // kibi: update root source on kibiState reset
      $scope.$listen(kibiState, 'reset_app_state_query', function () {
        $scope.filterResults();
      });
      // kibi: end

      // update root source when filters update
      $scope.$listen(filterBar, 'update', function () {
        dashboardState.applyFilters($scope.model.query, filterBar.getFilters());
      });

      // update data when filters fire fetch event
      $scope.$listen(filterBar, 'fetch', $scope.refresh);

      $scope.$on('$destroy', () => {
        dashboardState.destroy();

        // Remove dark theme to keep it from affecting the appearance of other apps.
        setLightTheme();
      });

      function updateTheme() {
        dashboardState.getDarkTheme() ? setDarkTheme() : setLightTheme();
      }

      function setDarkTheme() {
        chrome.removeApplicationClass(['theme-light']);
        chrome.addApplicationClass('theme-dark');
      }

      function setLightTheme() {
        chrome.removeApplicationClass(['theme-dark']);
        chrome.addApplicationClass('theme-light');
      }

      $scope.$on('ready:vis', function () {
        if (pendingVisCount > 0) pendingVisCount--;
        if (pendingVisCount === 0) {
          dashboardState.saveState();
          $scope.refresh();
        }
      });

      if ($route.current.params && $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM]) {
        $scope.addVis({ id: $route.current.params[DashboardConstants.NEW_VISUALIZATION_ID_PARAM] });
        kbnUrl.removeParam(DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM);
        kbnUrl.removeParam(DashboardConstants.NEW_VISUALIZATION_ID_PARAM);
      }

      const addNewVis = function addNewVis() {
        kbnUrl.change(
          `${VisualizeConstants.WIZARD_STEP_1_PAGE_PATH}?${DashboardConstants.ADD_VISUALIZATION_TO_DASHBOARD_MODE_PARAM}`);
      };

      $scope.opts = {
        displayName: dash.getDisplayName(),
        dashboard: dash,
        save: $scope.save,
        addVis: $scope.addVis,
        addNewVis,
        addSearch: $scope.addSearch,
        timefilter: $scope.timefilter
      };

      // kibi: Merge the parameters saved on kibi_appstate_param
      const passedState = JSON.parse(hashedItemStoreSingleton.getItem('kibi_appstate_param'));
      if (passedState && passedState.dashboardOptions) {
        _.assign($scope.opts.dashboard, _.cloneDeep(passedState.dashboardOptions));
        delete passedState.dashboardOptions;
        hashedItemStoreSingleton.setItem('kibi_appstate_param', JSON.stringify(passedState));
      }
      // kibi: end

      $scope.$emit('application.load');

      // KIBI5: try to add this back
      //// kibi: If you click the back/forward browser button:
      //// 1. The $locationChangeSuccess event is fired when you click back/forward browser button.
      //$rootScope.$on('$locationChangeSuccess', () => $rootScope.actualLocation = $location.url());
      //// 2. The following watcher is fired.
      //$rootScope.$watch(() => { return $location.url(); }, (newLocation, oldLocation) => {
        //if ($rootScope.actualLocation === newLocation) {
          //[> kibi: Here we execute init() if the newLocation is equal to the URL we saved during
          //the $locationChangeSuccess event above. */
          //init();
        //}
      //});
      //[> kibi: If you click an ordinary hyperlink, the above order is reversed.
         //First, you have the watcher fired, then the $locationChangeSuccess event.
         //That's why the actualLocation and newLocation will never be equal inside the watcher callback
         //if you click on an ordinary hyperlink.
       //*/
      //init();
    }
  };
});
