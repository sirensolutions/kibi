import _ from 'lodash';
import html from 'ui/doc_table/doc_table.html';
import getSort from 'ui/doc_table/lib/get_sort';
import 'ui/doc_table/doc_table.less';
import 'ui/directives/truncated';
import 'ui/directives/infinite_scroll';
import 'ui/doc_table/components/table_header';
import 'ui/doc_table/components/table_row';
import uiModules from 'ui/modules';

import { getLimitedSearchResultsMessage } from './doc_table_strings';

// kibi: imports
import ExportAsCsvProvider from 'plugins/kibi_data_table_vis/actions/csv_export';
// kibi:end

uiModules.get('kibana')
.directive('docTable', function (Private, courier, config, createNotifier, getAppState, pagerFactory, $filter) {
  return {
    restrict: 'E',
    template: html,
    scope: {
      sorting: '=',
      columns: '=',
      hits: '=?', // You really want either hits & indexPattern, OR searchSource
      indexPattern: '=?',
      searchSource: '=?',
      infiniteScroll: '=?',
      filter: '=?',
      onAddColumn: '=?',
      onChangeSortOrder: '=?',
      onMoveColumn: '=?',
      onRemoveColumn: '=?',

      // kibi:
      // added cellClickHandlers and columnAliases
      // to make them available to the scope of kibiTableRow and kibiTableHeader
      cellClickHandlers: '=',
      columnAliases: '=?',
      // kibi: increase the number of results that are retrieved
      increaseSample: '@?',
      // kibi: export hits as CSV
      csv: '@?',
      // kibi: resize hit count per page
      pageSize: '=?',
      // kibi: custom view
      templateId: '=?',
      showCustomView: '=?',
      customView: '=?',
      customViewerMode: '=?',
      // kibi: end
      // kibi: enable top paginator and min width for the columns, plus, make time field column optional
      enableTopPaginator: '=?',
      columnMinWidth: '=?',
      disableTimeField: '=?'
      // kibi: end
    },
    link: function ($scope) {
      const notify = createNotifier();
      $scope.limit = 50;
      $scope.persist = {
        sorting: $scope.sorting,
        columns: $scope.columns
      };

      // kibi: add exportAsCsv to the scope
      $scope.exportAsCsv = Private(ExportAsCsvProvider).exportAsCsv;

      // kibi: increase the number of results retrieved
      $scope.size = $scope.pageSize || parseInt(config.get('discover:sampleSize'));

      $scope.hasNextPage = function () {
        return $scope.increaseSample ? ($scope.pager.endItem !== $scope.totalHitCount) : $scope.pager.hasNextPage;
      };
      // kibi: end

      const prereq = (function () {
        const fns = [];

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
      const limitTo = $filter('limitTo');
      const calculateItemsOnPage = () => {
        $scope.pager.setTotalItems($scope.hits.length);
        $scope.pageOfItems = limitTo($scope.hits, $scope.pager.pageSize, $scope.pager.startIndex);
      };

      $scope.limitedResultsWarning = getLimitedSearchResultsMessage(config.get('discover:sampleSize'));

      $scope.addRows = function () {
        $scope.limit += 50;
      };

      // This exists to fix the problem of an empty initial column list not playing nice with watchCollection.
      $scope.$watch('columns', function (columns) {
        if (columns.length !== 0) return;

        const $state = getAppState();
        $scope.columns.push('_source');
        if ($state) $state.replace();
      });

      $scope.$watchCollection('columns', function (columns, oldColumns) {
        if (oldColumns.length === 1 && oldColumns[0] === '_source' && $scope.columns.length > 1) {
          _.pull($scope.columns, '_source');
        }

        if ($scope.columns.length === 0) $scope.columns.push('_source');
      });

      // Kibi: filters and query flags set on appState changes.
      // Attached to the scope for testing purposes
      $scope.filtersOrQueryChanged = false;

      // Kibi: catch query changes
      const removeGetAppStateHandler = $scope.$watch(getAppState, (appState) => {
        if (appState) {
          appState.on('save_with_changes', function (diff) {
            const checkQuery = _.indexOf(diff, 'query');
            const checkFilters = _.indexOf(diff, 'filters');
            if (checkQuery !== -1 || checkFilters !== -1) {
              $scope.filtersOrQueryChanged = true;
            }
          });
        }
      });

      const isPageSizeChanged = function () {
        return $scope.pageSize && $scope.pager && $scope.pageSize !== $scope.pager.pageSize;
      };

      const refreshTable = prereq(function () {
        if (!$scope.searchSource) return;

        $scope.indexPattern = $scope.searchSource.get('index');

        $scope.searchSource.size($scope.size);
        $scope.searchSource.sort(getSort($scope.sorting, $scope.indexPattern));

        // Set the watcher after initialization
        $scope.$watchCollection('sorting', function (newSort, oldSort) {
          // Don't react if sort values didn't really change
          if (!$scope.searchSource || newSort === oldSort) return;
          $scope.searchSource.sort(getSort(newSort, $scope.indexPattern));
          $scope.searchSource.fetchQueued();
        });

        $scope.$on('$destroy', function () {
          removeGetAppStateHandler();
          if ($scope.searchSource) $scope.searchSource.destroy();
        });

        // TODO: we need to have some way to clean up result requests
        $scope.searchSource.onResults().then(function onResults(resp) {
          // kibi: delete the error on searchSource if any
          delete $scope.searchSource.error;

          // Reset infinite scroll limit
          $scope.limit = 50;

          // Abort if something changed
          if ($scope.searchSource !== $scope.searchSource) return;

          $scope.hits = resp.hits.hits;
          // kibi: start the page
          let startingPage = 1;
          if ($scope.increaseSample && $scope.pager && ($scope.totalHitCount === resp.hits.total) && !$scope.filtersOrQueryChanged &&
              !isPageSizeChanged()) {
            startingPage = $scope.pager.currentPage;
          }

          // We limit the number of returned results, but we want to show the actual number of hits, not
          // just how many we retrieved.
          $scope.totalHitCount = resp.hits.total;

          $scope.pager = pagerFactory.create($scope.hits.length, $scope.pageSize || parseInt(config.get('discover:sampleSize')),
          startingPage);
          calculateItemsOnPage();

          // Kibi: reset the flag
          $scope.filtersOrQueryChanged = false;

          return $scope.searchSource.onResults().then(onResults);
        }).catch(notify.fatal);

        $scope.searchSource
        // kibi: notify the user what to do if more results cannot be retrieved
        .onError((error) => {
          if (error.message) {
            const matches = error.message.match(/from \+ size must be less than or equal to: \[(\d+)]/);
            if (matches) {
              const message = `Can't retrieve more than ${matches[1]} results.` +
                              'Please check the index.max_result_window Elasticsearch index setting.';
              const expError = new Error(message);
              expError.stack = message;
              return notify.error(expError);
            }
            // in kibi
            // notify if it is NOT a missing index error
            if (_.get(error, 'resp.error.type') === 'index_not_found_exception') {
              $scope.searchSource.error =
              (error.resp.error.reason && error.resp.error['resource.id']) ?
              error.resp.error.reason + ' ' + error.resp.error['resource.id'] :
              'Index not found';
            } else {
              return notify.error(error);
            }
          }
        })
        // kibi: end
        .catch(notify.fatal);
      });
      $scope.$watch('searchSource', refreshTable);
      $scope.$watch('pageSize', function (pageSize) {
        if (pageSize !== undefined) {
          $scope.size = $scope.pageSize;
          $scope.searchSource.size($scope.size);
          courier.fetch();
        }
      });

      $scope.pageOfItems = [];
      $scope.onPageNext = () => {
        const _onPageNext = function () {
          $scope.pager.nextPage();
          calculateItemsOnPage();
        };

        // kibi: fetch more results if possible
        if (!$scope.pager.hasNextPage && $scope.increaseSample) {
          if ($scope.size < $scope.totalHitCount) {
            const newSize = $scope.size * 2;
            if (newSize >= $scope.totalHitCount) {
              $scope.size = $scope.totalHitCount;
            } else {
              $scope.size = newSize;
            }
            $scope.searchSource.size($scope.size);
            return courier.fetch()
            .then(() => {
              _onPageNext();
            });
          }
        }
        _onPageNext();
      };

      $scope.onPagePrevious = () => {
        $scope.pager.previousPage();
        calculateItemsOnPage();
      };

      $scope.shouldShowLimitedResultsWarning = () => (
        // kibi: do not show warning if the increaseSample option is enabled
        !$scope.increaseSample && !$scope.pager.hasNextPage && $scope.pager.totalItems < $scope.totalHitCount
      );
    }
  };
});
