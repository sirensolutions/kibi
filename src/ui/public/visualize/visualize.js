define(function (require) {
  require('angular-sanitize');

  require('ui/modules')
  .get('kibana/directive', ['ngSanitize'])
  .directive('visualize', function (kibiState, savedDashboards, savedSearches, Private, config, $timeout, createNotifier) {

    require('ui/visualize/spy');
    require('ui/visualize/visualize.less');
    require('ui/visualize/visualize_legend');

    let $ = require('jquery');
    let _ = require('lodash');
    let visTypes = Private(require('ui/registry/vis_types'));
    // kibi: to hold onto stats about msearch requests from visualizations like the relational filter
    // This is then displayed in the multisearch spy mode
    const KibiSpyData = Private(require('ui/kibi/spy/kibi_spy_data'));

    let notify = createNotifier({
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
        esResp: '=?'
      },
      template: require('ui/visualize/visualize.html'),
      link: function ($scope, $el, attr) {
        let chart; // set in "vis" watcher
        let minVisChartHeight = 180;

        if (_.isUndefined($scope.showSpyPanel)) {
          $scope.showSpyPanel = true;
        }

        function getter(selector) {
          return function () {
            let $sel = $el.find(selector);
            if ($sel.size()) return $sel;
          };
        }

        let getVisEl = getter('.visualize-chart');
        let getVisContainer = getter('.vis-container');

        // Show no results message when isZeroHits is true and it requires search
        $scope.showNoResultsMessage = function () {
          let requiresSearch = _.get($scope, 'vis.type.requiresSearch');
          let isZeroHits = _.get($scope,'esResp.hits.total') === 0;
          let shouldShowMessage = !_.get($scope, 'vis.params.handleNoResults');

          return Boolean(requiresSearch && isZeroHits && shouldShowMessage);
        };

        $scope.fullScreenSpy = false;
        $scope.spy = {};
        $scope.spy.mode = ($scope.uiState) ? $scope.uiState.get('spy.mode', {}) : {};

        $scope.multiSearchData = null;
        if (_.get($scope, 'vis.type.requiresMultiSearch')) {
          $scope.multiSearchData = new KibiSpyData();
        }

        let applyClassNames = function () {
          let $visEl = getVisContainer();
          let $spyEl = getter('.visualize-spy-container')();
          let fullSpy = ($scope.spy.mode && ($scope.spy.mode.fill || $scope.fullScreenSpy));

          $visEl.toggleClass('spy-only', Boolean(fullSpy));
          if ($spyEl) {
            $spyEl.toggleClass('only', Boolean(fullSpy));
          }

          // kibi: skip checking that vis is too small
          if (_.get($scope, 'vis.type.name') === 'kibiqueryviewervis' || _.get($scope, 'vis.type.name') === 'kibi_sequential_join_vis') {
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
        let prereq = (function () {
          let fns = [];

          return function register(fn) {
            fns.push(fn);

            return function () {
              fn.apply(this, arguments);

              if (fns.length) {
                _.pull(fns, fn);
                // kibi: let the visualization broadcast this event
                // since it takes care of the searchSource
                if (!fns.length && !_.get($scope, 'vis.type.delegateSearch')) {
                  $scope.$root.$broadcast('ready:vis');
                }
              }
            };
          };
        }());

        let loadingDelay = config.get('visualization:loadingDelay');
        $scope.loadingStyle = {
          '-webkit-transition-delay': loadingDelay,
          'transition-delay': loadingDelay
        };

        function shouldHaveFullSpy() {
          let $visEl = getVisEl();
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
          let $visEl = getVisEl();
          if (!$visEl) return;

          if (!attr.editableVis) {
            $scope.editableVis = vis;
          }

          if (oldVis) $scope.renderbot = null;
          if (vis) $scope.renderbot = vis.type.createRenderbot(vis, $visEl, $scope.uiState, $scope.multiSearchData, $scope.searchSource);

          // kibi: associate the vis with the searchSource
          if ($scope.searchSource) {
            $scope.searchSource.vis = $scope.vis;
          }
          // kibi: end
        }));

        $scope.$watchCollection('vis.params', prereq(function () {
          if ($scope.renderbot) $scope.renderbot.updateParams();
        }));

        // kibi: if delegateSearch is true, the visualization takes care of retrieving the results.
        // kibi: if the visualization does not require a search do not trigger a query
        if (!_.get($scope, 'vis.type.delegateSearch') &&
            (_.get($scope, 'vis.type.requiresSearch') || _.get($scope, 'vis.type.requiresMultiSearch'))) {
          $scope.$watch('searchSource', prereq(function (searchSource) {
            if (!searchSource || attr.esResp) {
              return;
            }

            // TODO: we need to have some way to clean up result requests
            searchSource.onResults().then(function onResults(resp) {
              if ($scope.searchSource !== searchSource) return;

              $scope.esResp = resp;

              return searchSource.onResults().then(onResults);
            }).catch(notify.fatal);

            searchSource.onError(notify.error).catch(notify.fatal);
          }));
        }

        $scope.$watch('esResp', prereq(function (resp, prevResp) {
          if (!resp) return;

          // kibi: This is needed by multichart to stop re-render es responses
          //       can be used too to change the response before render process take place
          if ($scope.vis.esResponseAdapter) {
            const result = $scope.vis.esResponseAdapter(resp);
            if (result) {
              $scope.renderbot.render(result);
              return;
            }
          }
          // kibi: end

          $scope.renderbot.render(resp);
        }));

        $scope.$watch('renderbot', function (newRenderbot, oldRenderbot) {
          if (oldRenderbot && newRenderbot !== oldRenderbot) {
            oldRenderbot.destroy();
          }
        });

        // kibi: Backport from 5.4, adds getUiState() to the vis object.
        if ($scope.vis) {
          $scope.vis.getUiState = () => {
            return $scope.uiState;
          };
        }
        // kibi: end

        $scope.$on('$destroy', function () {
          if ($scope.renderbot) {
            $scope.renderbot.destroy();
          }
        });
      }
    };
  });
});
