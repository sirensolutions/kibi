define(function (require) {
  var _ = require('lodash');
  var html = require('text!components/sindicetech/st_doc_table/st_doc_table.html');
  var getSort = require('components/doc_table/lib/get_sort');

  require('css!components/doc_table/doc_table.css');
  require('css!components/sindicetech/st_doc_table/st_doc_table.css');
  require('directives/truncated');
  require('directives/infinite_scroll');
  require('components/doc_table/components/table_header');
  require('components/sindicetech/st_doc_table/components/st_table_row');

  require('modules').get('kibana')
  .directive('stDocTable', function (config, Notifier, queryEngineClient, savedQueries, Promise, Private, courier) {

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

        // to make the cellClickHandlers available to the scope of stKbnTableRow
        cellClickHandlers: '=',
        queryColumn: '='
      },
      link: function ($scope) {

        var notify = new Notifier();
        $scope.limit = 50;
        $scope.persist = {
          sorting: $scope.sorting,
          columns: $scope.columns
        };

        $scope.addRows = function () {
          $scope.limit += 50;
        };


        try {
          $scope.size = parseInt(config.get('discover:sampleSize'));
        } catch (e) {
          throw new Error(
            'Could not parse discover:sampleSize configuration value.' +
            ' Expected number got [' + config.get('discover:sampleSize') + ']'
          );
        }

        $scope.increaseSize = function () {
          if ($scope.size < $scope.total) {
            if ($scope.size * 2 >= $scope.total) {
              $scope.size = $scope.total;
            } else {
              $scope.size = $scope.size * 2;
            }
            $scope.searchSource.size($scope.size);
            courier.fetch();
          }
        };

        $scope.$watch('searchSource', function (searchSource) {
          if (!$scope.searchSource) return;

          $scope.indexPattern = $scope.searchSource.get('index');

          $scope.searchSource.size($scope.size);
          $scope.searchSource.sort(getSort($scope.sorting, $scope.indexPattern));

          var sourceFiltering = $scope.indexPattern.getSourceFiltering();
          if (sourceFiltering) {
            $scope.searchSource.source(sourceFiltering);
          }

          // Set the watcher after initialization
          $scope.$watchCollection('sorting', function (newSort, oldSort) {
            // Don't react if sort values didn't really change
            if (newSort === oldSort) return;
            $scope.searchSource.sort(getSort(newSort, $scope.indexPattern));
            $scope.searchSource.fetchQueued();
          });

          $scope.$on('$destroy', function () {
            if ($scope.searchSource) $scope.searchSource.destroy();
          });

          var previousSearchSource = $scope.searchSource;

          // TODO: we need to have some way to clean up result requests
          $scope.searchSource.onResults().then(function onResults(searchResp) {

            $scope.total = searchResp.hits.total || 0;

            // Reset infinite scroll limit
            $scope.limit = 50;

            if ($scope.searchSource !== previousSearchSource) {
              return;
            }

            if ($scope.queryColumn && $scope.queryColumn.name) {
              _.each(searchResp.hits.hits, function (hit) {
                hit._source[$scope.queryColumn.name] = '-';
                if (hit.fields[$scope.queryColumn.name] &&
                    hit.fields[$scope.queryColumn.name] instanceof Array &&
                    hit.fields[$scope.queryColumn.name].length > 0) {
                  hit._source[$scope.queryColumn.name] = hit.fields[$scope.queryColumn.name].join(', ');
                }
                delete hit.fields[$scope.queryColumn.name];
              });
            }
            $scope.hits = searchResp.hits.hits;

            return $scope.searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          $scope.searchSource.onError(notify.error).catch(notify.fatal);
        });

      }
    };
  });
});
