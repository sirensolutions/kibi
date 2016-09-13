define(function (require) {
  const _ = require('lodash');

  const html = require('ui/kibi/kibi_doc_table/kibi_doc_table.html');
  const getSort = require('ui/doc_table/lib/get_sort');

  require('ui/directives/truncated');
  require('ui/directives/infinite_scroll');
  require('ui/doc_table/components/table_header');

  require('ui/kibi/kibi_doc_table/kibi_doc_table.less');
  require('ui/kibi/kibi_doc_table/components/kibi_table_row');
  require('ui/kibi/components/query_engine_client/query_engine_client');

  require('ui/modules').get('kibana')
  .directive('kibiDocTable', function (config, createNotifier, getAppState, queryEngineClient, savedQueries, Promise, Private, courier) {
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

        // kibi: to make the cellClickHandlers available to the scope of kibiTableRow
        cellClickHandlers: '=',
        queryColumn: '='
      },
      link: function ($scope) {
        const notify = createNotifier({
          location: 'Enhanced search results'
        });
        $scope.limit = 50;
        $scope.persist = {
          sorting: $scope.sorting,
          columns: $scope.columns
        };

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

        // Export results as CSV
        $scope._saveAs = require('@spalger/filesaver').saveAs;
        $scope.csv = {
          separator: config.get('csv:separator'),
          quoteValues: config.get('csv:quoteValues')
        };

        $scope.exportAsCsv = function () {
          const csv = new Blob([$scope.toCsv()], { type: 'text/plain' });
          const filename = (_.get($scope, '$parent.savedVis.id') || 'kibi-table') + '.csv';
          $scope._saveAs(csv, filename);
        };

        $scope.toCsv = function () {
          const rows = $scope.hits;
          const nonAlphaNumRE = /[^a-zA-Z0-9]/;
          const allDoubleQuoteRE = /"/g;
          let columns;

          if ($scope.indexPattern.timeFieldName) {
            columns = [ $scope.indexPattern.timeFieldName, ...$scope.columns ];
          } else {
            columns = $scope.columns;
          }

          function escape(val) {
            if (_.isObject(val)) {
              val = val.valueOf();
            }
            val = String(val);
            if ($scope.csv.quoteValues && nonAlphaNumRE.test(val)) {
              val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
            }
            return val;
          }

          // escape each cell in each row
          const csvRows = rows.map(function (row) {
            return _.map(columns, (column, i) => {
              if (i === 0 && $scope.indexPattern.timeFieldName) {
                const text = $scope.indexPattern.formatField(row, column);
                return escape(text);
              } else {
                return escape(_.get(row._source, column));
              }
            });
          });

          // add the columns to the rows
          csvRows.unshift(columns.map(escape));

          return csvRows.map(function (row) {
            return row.join($scope.csv.separator) + '\r\n';
          }).join('');
        };

        $scope.addRows = function () {
          $scope.limit += 50;
        };

        // kibi: increase the number of results retrieved
        const sampleSize = config.get('discover:sampleSize');
        try {
          $scope.size = parseInt(sampleSize);
        } catch (e) {
          throw new Error(`Could not parse discover:sampleSize configuration value. Expected number got [${sampleSize}]`);
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
        // kibi: end

        $scope.$watch('searchSource', prereq(function (searchSource) {
          if (!$scope.searchSource) return;

          $scope.indexPattern = $scope.searchSource.get('index');

          $scope.searchSource.size($scope.size);
          $scope.searchSource.sort(getSort($scope.sorting, $scope.indexPattern));

          // kibi: source filtering
          const sourceFiltering = $scope.indexPattern.getSourceFiltering();
          if (sourceFiltering && sourceFiltering.all) {
            $scope.searchSource.source(sourceFiltering.all);
          }
          // kibi: end

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

          const previousSearchSource = $scope.searchSource;

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
                const name = $scope.queryColumn.name;
                hit._source[name] = '-';
                if (hit.fields) {
                  if (hit.fields[name] &&
                      hit.fields[name] instanceof Array &&
                      hit.fields[name].length > 0) {
                    hit._source[name] = hit.fields[name].join(', ');
                  }
                  delete hit.fields[name];
                }
              });
            }
            $scope.hits = searchResp.hits.hits;

            return $scope.searchSource.onResults().then(onResults);
          }).catch(notify.fatal);

          $scope.searchSource.onError(notify.error).catch(notify.fatal);
        }));

      }
    };
  });
});
