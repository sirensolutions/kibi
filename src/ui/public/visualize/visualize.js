define(function (require) {
  require('angular-sanitize');

  require('ui/modules')
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualize', function (kibiState, savedDashboards, savedSearches, Private, config, $timeout, createNotifier) {

    require('ui/visualize/spy');
    require('ui/visualize/visualize.less');
    require('ui/visualize/visualize_legend');

    var $ = require('jquery');
    var _ = require('lodash');
    var visTypes = Private(require('ui/registry/vis_types'));
    // kibi: to hold onto stats about msearch requests from visualizations like the relational filter
    // This is then displayed in the multisearch spy mode
    const KibiSpyData = Private(require('ui/kibi/spy/kibi_spy_data'));

    var notify = createNotifier({
      location: 'Visualize'
    });

    return {
      restrict: 'E',
      scope : {
        showSpyPanel: '=?',
        vis: '=',
        uiState: '=?',
        searchSource: '=?',
        editableVis: '=?',
        esResp: '=?',
      },
      template: require('ui/visualize/visualize.html'),
      link: function ($scope, $el, attr) {
        var chart; // set in "vis" watcher
        var minVisChartHeight = 180;

        if (_.isUndefined($scope.showSpyPanel)) {
          $scope.showSpyPanel = true;
        }

        function getter(selector) {
          return function () {
            var $sel = $el.find(selector);
            if ($sel.size()) return $sel;
          };
        }

        var getVisEl = getter('.visualize-chart');
        var getVisContainer = getter('.vis-container');

        // Show no results message when isZeroHits is true and it requires search
        $scope.showNoResultsMessage = function () {
          var requiresSearch = _.get($scope, 'vis.type.requiresSearch');
          var isZeroHits = _.get($scope,'esResp.hits.total') === 0;
          var shouldShowMessage = !_.get($scope, 'vis.params.handleNoResults');

          return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
        };

        $scope.fullScreenSpy = false;
        $scope.spy = {};
        $scope.spy.mode = ($scope.uiState) ? $scope.uiState.get('spy.mode', {}) : {};

        $scope.multiSearchData = null;
        if ($scope.vis.type.requiresMultiSearch) {
          $scope.multiSearchData = new KibiSpyData();
        }

        var applyClassNames = function () {
          var $visEl = getVisContainer();
          var $spyEl = getter('.visualize-spy-container')();
          var fullSpy = ($scope.spy.mode && ($scope.spy.mode.fill || $scope.fullScreenSpy));

          $visEl.toggleClass('spy-only', Boolean(fullSpy));
          if ($spyEl) {
            $spyEl.toggleClass('only', Boolean(fullSpy));
          }

          // kibi: skip checking that vis is too small
          if (
            $scope.vis &&
            ($scope.vis.type.name === 'kibiqueryviewervis' || $scope.vis.type.name === 'kibi_sequential_join_vis')
          ) {
            // for these 2 visualisations
            // buttons are small and query viewer dynamically inject html so at the begining
            // its size is 0;
            return;
          }
          // kibi: end

          $timeout(function () {
            if (shouldHaveFullSpy()) {
              $visEl.addClass('spy-only');
              if ($spyEl) {
                $spyEl.toggleClass('only', Boolean(fullSpy));
              }
            };
          }, 0);
        };

        // we need to wait for some watchers to fire at least once
        // before we are "ready", this manages that
        var prereq = (function () {
          var fns = [];

          return function register(fn) {
            fns.push(fn);

            return function () {
              fn.apply(this, arguments);

              if (fns.length) {
                _.pull(fns, fn);
                if (!fns.length) {
                  $scope.$root.$broadcast('ready:vis');
                }
              }
            };
          };
        }());

        var loadingDelay = config.get('visualization:loadingDelay');
        $scope.loadingStyle = {
          '-webkit-transition-delay': loadingDelay,
          'transition-delay': loadingDelay
        };

        function shouldHaveFullSpy() {
          var $visEl = getVisEl();
          if (!$visEl) return;

          return ($visEl.height() < minVisChartHeight)
            && _.get($scope.spy, 'mode.fill')
            && _.get($scope.spy, 'mode.name');
        }

        // spy watchers
        $scope.$watch('fullScreenSpy', applyClassNames);

        $scope.$watchCollection('spy.mode', function () {
          $scope.fullScreenSpy = shouldHaveFullSpy();
          applyClassNames();
        });

        $scope.$watch('vis', prereq(function (vis, oldVis) {
          var $visEl = getVisEl();
          if (!$visEl) return;

          if (!attr.editableVis) {
            $scope.editableVis = vis;
          }

          if (oldVis) $scope.renderbot = null;
          if (vis) $scope.renderbot = vis.type.createRenderbot(vis, $visEl, $scope.uiState, $scope.multiSearchData);
        }));

        $scope.$watchCollection('vis.params', prereq(function () {
          if ($scope.renderbot) $scope.renderbot.updateParams();
        }));

        $scope.$watch('searchSource', prereq(function (searchSource) {
          // kibi: get the saved search associated with the current dashboard, in order to have the correct search_source
          if (searchSource && !$scope.vis.type.requiresSearch) {
            $scope.searchSource.disable();
            savedDashboards.find().then(function (resp) {
              const savedCurrentDashboard = _.find(resp.hits, 'id', kibiState._getCurrentDashboardId());
              if (savedCurrentDashboard && savedCurrentDashboard.savedSearchId) {
                return savedSearches.get(savedCurrentDashboard.savedSearchId).then(function (savedSearch) {
                  $scope.searchSource.inherits(savedSearch.searchSource);
                  $scope.searchSource.enable();
                });
              }
            }).catch(notify.error);
          }
          // kibi: end
          if (!searchSource || attr.esResp) return;

          // TODO: we need to have some way to clean up result requests
          searchSource.onResults().then(function onResults(resp) {
            if ($scope.searchSource !== searchSource) return;

            $scope.esResp = resp;

            return searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          searchSource.onError(notify.error).catch(notify.fatal);
        }));

        $scope.$watch('esResp', prereq(function (resp, prevResp) {
          if (!resp) return;
          $scope.renderbot.render(resp);
        }));

        $scope.$watch('renderbot', function (newRenderbot, oldRenderbot) {
          if (oldRenderbot && newRenderbot !== oldRenderbot) {
            oldRenderbot.destroy();
          }
        });

        $scope.$on('$destroy', function () {
          if ($scope.renderbot) {
            $scope.renderbot.destroy();
          }
        });
      }
    };
  });
});
