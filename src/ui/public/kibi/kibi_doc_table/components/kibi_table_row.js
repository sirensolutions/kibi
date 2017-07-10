define(function (require) {
  const _ = require('lodash');
  const $ = require('jquery');
  const module = require('ui/modules').get('app/discover');

  require('ui/highlight');
  require('ui/highlight/highlight_tags');
  require('ui/doc_viewer');
  require('ui/filters/trust_as_html');
  require('ui/filters/short_dots');


  // guesstimate at the minimum number of chars wide cells in the table should be
  const MIN_LINE_LENGTH = 20;

  /**
   * kibiTableRow directive. Copied from kbnTableRow for Kibi
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kibi-table-row="row"></tr>
   * ```
   */
  module.directive('kibiTableRow', function ($compile, kibiState, $window, createNotifier, Private, courier) {
    const noWhiteSpace = require('ui/utils/no_white_space');

    const dashboardHelper = Private(require('ui/kibi/helpers/dashboard_helper'));
    const openRowHtml = require('ui/doc_table/components/table_row/open.html');
    const detailsHtml = require('ui/kibi/kibi_doc_table/components/kibi_table_row/details.html');
    const cellTemplate = _.template(noWhiteSpace(require('ui/kibi/kibi_doc_table/components/kibi_table_row/cell.html')));
    const truncateByHeightTemplate = _.template(noWhiteSpace(require('ui/partials/truncate_by_height.html')));
    const queryFilter = Private(require('ui/filter_bar/query_filter'));

    const notify = createNotifier({
      location: 'Enhanced search results'
    });

    return {
      restrict: 'A',
      scope: {
        columns: '=',
        columnAliases: '=?',
        filter: '=',
        indexPattern: '=',
        row: '=kibiTableRow',
        // kibi: associate an action when clicking on a cell
        cellClickHandlers: '='
      },
      link: function ($scope, $el, attrs) {
        $el.after('<tr>');
        $el.empty();

        const init = function () {
          createSummaryRow($scope.row, $scope.row._id);
        };

        // when we compile the details, we use this $scope
        let $detailsScope;

        // when we compile the toggle button in the summary, we use this $scope
        let $toggleScope;

        // toggle display of the rows details, a full list of the fields from each row
        $scope.toggleRow = function () {
          const $detailsTr = $el.next();

          $scope.open = !$scope.open;

          ///
          // add/remove $details children
          ///

          $detailsTr.toggle($scope.open);

          if (!$scope.open) {
            // close the child scope if it exists
            $detailsScope.$destroy();
            // no need to go any further
            return;
          } else {
            $detailsScope = $scope.$new();
          }

          // empty the details and rebuild it
          $detailsTr.html(detailsHtml);

          $detailsScope.row = $scope.row;
          // kibi: passing columns and columnAliases to details view
          $detailsScope.columns = $scope.columns;
          $detailsScope.columnAliases = $scope.columnAliases;

          $compile($detailsTr)($detailsScope);
        };

        // kibi: cell actions
        $scope.$watch('cellClickHandlers', function () {
          createSummaryRow($scope.row);
        }, true);

        $scope.$listen(kibiState, 'save_with_changes', function (diff) {
          if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
              diff.indexOf(kibiState._properties.selected_entity_disabled) !== -1 ||
              diff.indexOf(kibiState._properties.test_selected_entity) !== -1) {
            createSummaryRow($scope.row);
          }
        });
        // kibi: end of cell actions

        $scope.$watchCollection('columns', function () {
          createSummaryRow($scope.row, $scope.row._id);
        });

        $scope.$watch('row', function () {
          createSummaryRow($scope.row);
        }, true);

        $scope.$watchMulti(['indexPattern.timeFieldName', 'row.highlight'], function () {
          createSummaryRow($scope.row, $scope.row._id);
        });

        // create a tr element that lists the value for each *column*
        function createSummaryRow(row) {
          const indexPattern = $scope.indexPattern;

          // We just create a string here because its faster.
          const newHtmls = [
            openRowHtml
          ];

          if (indexPattern.timeFieldName) {
            newHtmls.push(cellTemplate({
              timefield: true,
              formatted: _displayField(row, indexPattern.timeFieldName),
              column: null
            }));
          }

          $scope.columns.forEach(function (column) {
            newHtmls.push(cellTemplate({
              timefield: false,
              sourcefield: (column === '_source'),
              formatted: _displayField(row, column, true),
              // kibi: this is to retrieve the correct cell when applying click actions
              column: column
            }));
          });

          let $cells = $el.children();

          // kibi: entity selection
          $el.children('[data-column]')
            .removeClass('selectedEntityCell disabled')
            .css('cursor', 'auto')
            .off('click');

          newHtmls.forEach(function (html, i) {
            const $cell = $cells.eq(i);
            // kibi: cell actions
            const column = $cell.data('column');

            // Remove click CSS style for every cell
            $cell.removeClass('click');

            if ($scope.cellClickHandlers && $scope.cellClickHandlers[column]) {

              _.each($scope.cellClickHandlers[column], function (clickHandler) {

                const type = clickHandler.type;

                // With filter type we want to reproduce the same UI as for the normal table
                if (type === 'filter') {
                  $cell.addClass('cell-hover')
                  .css('cursor', 'cell')
                  .bind('click', function (e) {
                    e.preventDefault();

                    const cellValue = row.$$_flattened[column];
                    queryFilter.addFilters({
                      meta: {
                        index: $scope.indexPattern.id,
                        disabled: false,
                        negate: false,
                      },
                      query: {
                        match: {
                          [column]: {
                            query: cellValue,
                            type: 'phrase'
                          }
                        }
                      }
                    });
                  });
                } else {
                  // Style the cell value as a link
                  $cell.addClass('click');

                  if (type === 'select' &&
                      kibiState.isEntitySelected(row.$$_flattened._index, row.$$_flattened._type, row.$$_flattened._id, column)) {
                    if (kibiState.isSelectedEntityDisabled()) {
                      $cell.addClass('selectedEntityCell disabled');
                    } else {
                      $cell.addClass('selectedEntityCell');
                    }
                  }

                  $cell.css('cursor', 'pointer').bind('click', function (e) {
                    e.preventDefault();

                    if (type === 'link') {
                      const valueField = clickHandler.valueField;
                      let idValue = row.$$_flattened[valueField];
                      const uriFormat = clickHandler.uriFormat;

                      // Check if idValue is an array; if so, use the first
                      // element of the array as the value and display a warning
                      if (idValue instanceof Array && idValue.length > 0) {
                        notify.warning(
                            'Field [' + valueField + '] used in an click handler contains more than one value.' +
                            'The first value will be used.'
                            );
                        idValue = idValue[0];
                      }

                      // skip event handling if no value is set
                      if (!idValue) {
                        return;
                      }
                      // open the URL in a new tab
                      let win;
                      if (uriFormat.trim() === '@URL@') {
                        win = $window.open(idValue, '_blank');
                      } else {
                        win = $window.open(uriFormat.replace(/@URL@/g, encodeURIComponent(idValue)), '_blank');
                      }
                      if (win) {
                        win.focus();
                      }

                    } else if (type === 'select') {
                      const entity = {
                        index: row.$$_flattened._index,
                        type: row.$$_flattened._type,
                        id: row.$$_flattened._id,
                        column
                      };
                      kibiState.disableSelectedEntity(false);
                      kibiState.setEntityURI(entity);
                      kibiState.save();

                      // switch to a different dashboard only if user gave one in settings
                      const targetDashboardId = clickHandler.targetDashboardId;
                      if (targetDashboardId) {
                        return dashboardHelper.switchDashboard(targetDashboardId);
                      } else {
                        // Call courier.fetch to update visualizations
                        // This will update all the visualisations, not only the one
                        // which strictly depend on selected entityURI
                        courier.fetch();
                      }
                    }

                  });
                }
              });

            }

            if ($cell.data('discover:html') === html) return;

            const reuse = _.find($cells.slice(i + 1), function (cell) {
              return $.data(cell, 'discover:html') === html;
            });

            const $target = reuse ? $(reuse).detach() : $(html);
            $target.data('discover:html', html);
            const $before = $cells.eq(i - 1);
            if ($before.size()) {
              $before.after($target);
            } else {
              $el.append($target);
            }

            // rebuild cells since we modified the children
            $cells = $el.children();

            if (i === 0 && !reuse) {
              $toggleScope = $scope.$new();
              $compile($target)($toggleScope);
            }
          });

          if ($scope.open) {
            $detailsScope.row = row;
          }

          // trim off cells that were not used rest of the cells
          $cells.filter(':gt(' + (newHtmls.length - 1) + ')').remove();
        }

        /**
         * Fill an element with the value of a field
         */
        function _displayField(row, fieldName, truncate) {
          const indexPattern = $scope.indexPattern;
          const text = indexPattern.formatField(row, fieldName);

          if (truncate && text.length > MIN_LINE_LENGTH) {
            return truncateByHeightTemplate({
              body: text
            });
          }

          return text;
        }

        init();
      }
    };
  });
});
