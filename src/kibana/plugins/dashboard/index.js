define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var angular = require('angular');
  var ConfigTemplate = require('utils/config_template');

  require('directives/config');
  require('components/courier/courier');
  require('components/config/config');
  require('components/notify/notify');
  require('components/typeahead/typeahead');
  require('components/clipboard/clipboard');


  require('plugins/dashboard/directives/grid');
  require('plugins/dashboard/components/panel/panel');
  require('plugins/dashboard/services/saved_dashboards');
  require('css!plugins/dashboard/styles/main.css');

  var app = require('modules').get('app/dashboard', [
    'elasticsearch',
    'ngRoute',
    'kibana/courier',
    'kibana/config',
    'kibana/notify',
    'kibana/typeahead'
  ]);

  require('routes')
  .when('/dashboard', {
    template: require('text!plugins/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards) {
        return savedDashboards.get();
      }
    }
  })
  .when('/dashboard/:id', {
    template: require('text!plugins/dashboard/index.html'),
    resolve: {
      dash: function (savedDashboards, Notifier, $route, $location, courier) {
        return savedDashboards.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          'dashboard' : '/dashboard'
        }));
      }
    }
  });

  app.directive('dashboardApp', function (Notifier, courier, AppState, timefilter, kbnUrl, $rootScope, config) {
    return {
      controller: function ($scope, $rootScope, $route, $routeParams, $location, configFile, Private, getAppState) {
        var queryFilter = Private(require('components/filter_bar/query_filter'));
        var cache = Private(require('components/sindicetech/cache_helper/cache_helper'));
        var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));

        var notify = new Notifier({
          location: 'Dashboard'
        });

        var dash = $scope.dash = $route.current.locals.dash;

        if (dash.timeRestore && dash.timeTo && dash.timeFrom && !getAppState.previouslyStored()) {
          timefilter.time.to = dash.timeTo;
          timefilter.time.from = dash.timeFrom;
        }

        var matchQueryFilter = function (filter) {
          return filter.query && filter.query.query_string && !filter.meta && !filter.join_set;
        };

        var extractQueryFromFilters = function (filters) {
          var filter = _.find(filters, matchQueryFilter);
          if (filter) return filter.query;
        };

        var stateDefaults = {
          title: dash.title,
          panels: dash.panelsJSON ? JSON.parse(dash.panelsJSON) : [],
          query: extractQueryFromFilters(dash.searchSource.getOwn('filter')) || {query_string: {query: '*'}},
          filters: _.reject(dash.searchSource.getOwn('filter'), matchQueryFilter)
        };

        var $state = $scope.state = new AppState(stateDefaults);

        var _addRemoveJoinSetFilter = function (panelEnabled) {
          if (panelEnabled === false) {
            $state.filters = _.filter($state.filters, function (f) {
              return !f.join_set;
            });
          } else {
            joinFilterHelper.updateJoinSetFilter();
          }
        };

        var relationalPanelListenerOff = $rootScope.$on('change:config.kibi:relationalPanel', function (event, panelEnabled) {
          _addRemoveJoinSetFilter(panelEnabled);
        });
        _addRemoveJoinSetFilter(config.get('kibi:relationalPanel'));

        $scope.configTemplate = new ConfigTemplate({
          save: require('text!plugins/dashboard/partials/save_dashboard.html'),
          load: require('text!plugins/dashboard/partials/load_dashboard.html'),
          share: require('text!plugins/dashboard/partials/share.html'),
          pickVis: require('text!plugins/dashboard/partials/pick_visualization.html')
        });

        $scope.refresh = _.bindKey(courier, 'fetch');

        timefilter.enabled = true;
        $scope.timefilter = timefilter;
        $scope.$listen(timefilter, 'fetch', $scope.refresh);

        courier.setRootSearchSource(dash.searchSource);

        function init() {
          updateQueryOnRootSource();

          var docTitle = Private(require('components/doc_title/doc_title'));
          if (dash.id) {
            docTitle.change(dash.title);
          }

          $scope.$emit('application.load');
        }

        function updateQueryOnRootSource() {
          var filters = queryFilter.getFilters();
          if ($state.query) {
            dash.searchSource.set('filter', _.union(filters, [{
              query: $state.query
            }]));
          } else {
            dash.searchSource.set('filter', filters);
          }
        }

        // update root source when filters update
        $scope.$listen(queryFilter, 'update', function () {
          updateQueryOnRootSource();
          $state.save();
        });

        // update data when filters fire fetch event
        $scope.$listen(queryFilter, 'fetch', $scope.refresh);


        // added by sindicetech so the st-dashboard-toolbar which was moved out
        // could comunicate with the main app
        var stDashboardInvokeMethodOff = $rootScope.$on('stDashboardInvokeMethod', function (event, methodName) {
          $scope[methodName]();
        });
        var stDashboardSetProperty = $rootScope.$on('stDashboardSetProperty', function (event, property, data) {
          $scope[property] = data;
        });

        $scope.$on('$destroy', function () {
          dash.destroy();
          stDashboardInvokeMethodOff();
          stDashboardSetProperty();
          relationalPanelListenerOff();
        });

        $scope.$watch('configTemplate', function () {
          $rootScope.$emit('stDashboardOnProperty', 'configTemplate', $scope.configTemplate);
        }, true);
        $scope.$watch('state', function () {
          $rootScope.$emit('stDashboardOnProperty', 'state', $scope.state);
        }, true);
        // sindicetech finish


        $scope.newDashboard = function () {
          kbnUrl.change('/dashboard/', {});
        };

        $scope.filterResults = function () {
          updateQueryOnRootSource();
          $state.save();
          $scope.refresh();
        };

        $scope.save = function () {
          $state.title = dash.id = dash.title;
          $state.save();
          dash.panelsJSON = angular.toJson($state.panels);
          dash.timeFrom = dash.timeRestore ? timefilter.time.from : undefined;
          dash.timeTo = dash.timeRestore ? timefilter.time.to : undefined;

          dash.save()
          .then(function (id) {
            $scope.configTemplate.close('save');
            if (id) {
              notify.info('Saved Dashboard as "' + dash.title + '"');
              // added by kibi
              $rootScope.$emit('kibi:dashboard:changed', id);
              // added by kibi end
              if (dash.id !== $routeParams.id) {
                kbnUrl.change('/dashboard/{{id}}', {id: dash.id});
              }


            }
          })
          .catch(notify.fatal);
        };

        var pendingVis = _.size($state.panels);
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
          $state.panels.push({ id: hit.id, type: 'visualization' });
        };

        $scope.addSearch = function (hit) {
          pendingVis++;
          $state.panels.push({ id: hit.id, type: 'search' });
        };

        // Setup configurable values for config directive, after objects are initialized
        $scope.opts = {
          dashboard: dash,
          save: $scope.save,
          addVis: $scope.addVis,
          addSearch: $scope.addSearch,
          shareData: function () {
            return {
              link: $location.absUrl(),
              // These suck, but seems like the cleanest way. Uhg.
              embed: '<iframe src="' + $location.absUrl().replace('?', '?embed&') +
                '" height="600" width="800"></iframe>',
              embedAllDashboards: '<iframe src="' + $location.absUrl().replace('?', '?embed&embedAllDashboards&') +
              '" height="600" width="800"></iframe>'
            };
          }
        };

        init();
      }
    };
  });

  var apps = require('registry/apps');
  apps.register(function DashboardAppModule() {
    return {
      id: 'dashboard',
      name: 'Dashboard',
      order: 2
    };
  });
});
