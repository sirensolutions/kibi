import _ from 'lodash';
import uiModules from 'ui/modules';

import html from 'ui/kibi/kibi_doc_table/kibi_doc_table.html';
import getSort from 'ui/doc_table/lib/get_sort';

import 'ui/directives/truncated';
import 'ui/directives/infinite_scroll';
import 'ui/doc_table/components/table_header';

import 'ui/kibi/kibi_doc_table/kibi_doc_table.less';
import 'ui/kibi/kibi_doc_table/components/kibi_table_row';
import 'ui/kibi/kibi_doc_table/components/kibi_table_header';

import fileSaver from '@spalger/filesaver';

// kibi: allow to query external datasources for populating a column
import 'ui/kibi/components/query_engine_client/query_engine_client';
import VirtualIndexPatternProvider from 'ui/kibi/components/commons/virtual_index_pattern';
import FieldFormatsProvider from 'ui/registry/field_formats';

uiModules
.get('kibana')
.directive('kibiDocTable', function (getAppState, kibiState, config, createNotifier, Private, courier) {
  const VirtualIndexPattern = Private(VirtualIndexPatternProvider);
  const fieldFormats = Private(FieldFormatsProvider);

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

      // kibi:
      // added cellClickHandlers, queryColumn and columnAliases
      // to make them available to the scope of kibiTableRow and kibiTableHeader
      cellClickHandlers: '=',
      queryColumn: '=',
      columnAliases: '=?',
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
      $scope._saveAs = fileSaver.saveAs;
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

      function addRelationalColumn() {
        // validate here and do not inject if all require values are not set
        if ($scope.queryColumn && $scope.queryColumn.queryDefinitions && $scope.queryColumn.queryDefinitions.length &&
            $scope.queryColumn.joinElasticsearchField && $scope.queryColumn.name) {
          const virtualField = {
            analyzed: false,
            bucketable: true,
            count: 0,
            displayName: $scope.queryColumn.name,
            name: $scope.queryColumn.name,
            scripted: false,
            sortable: false,
            type: 'string',
            format: fieldFormats.getDefaultInstance('string')
          };
          const virtualIndexPattern = new VirtualIndexPattern($scope.indexPattern, virtualField);
          $scope.searchSource.index(virtualIndexPattern);

          $scope.searchSource.inject([
            {
              entityURI: kibiState.isSelectedEntityDisabled() ? '' : kibiState.getEntityURI(),
              queryDefs: $scope.queryColumn.queryDefinitions,
              // it is the field from table to do the comparison
              sourcePath: $scope.indexPattern.fields.byName[$scope.queryColumn.joinElasticsearchField].path,
              fieldName: $scope.queryColumn.name
            }
          ]);
        }
      }

      $scope.$listen(kibiState, 'save_with_changes', function (diff) {
        if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
            diff.indexOf(kibiState._properties.selected_entity_disabled) !== -1 ||
            diff.indexOf(kibiState._properties.test_selected_entity) !== -1) {
          addRelationalColumn();
        }
      });

      $scope.$watch('searchSource', prereq(function (searchSource) {
        if (!$scope.searchSource) return;

        $scope.indexPattern = $scope.searchSource.get('index');

        $scope.searchSource.size($scope.size);
        $scope.searchSource.sort(getSort($scope.sorting, $scope.indexPattern));

        // kibi: relational column
        addRelationalColumn();
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

          // kibi: add the relational column
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

        $scope.searchSource
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
          }
          notify.error(error);
        })
        .catch(notify.error);
      }));

    }
  };
});
