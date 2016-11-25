define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var addWordBreaks = require('ui/utils/add_word_breaks');
  var module = require('ui/modules').get('app/discover');

  require('ui/highlight');
  require('ui/highlight/highlight_tags');
  require('ui/doc_viewer');
  require('ui/filters/trust_as_html');
  require('ui/filters/short_dots');


  // guesstimate at the minimum number of chars wide cells in the table should be
  var MIN_LINE_LENGTH = 20;

  /**
   * kibiTableRow directive. Copied from kbnTableRow for Kibi
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kibi-table-row="row"></tr>
   * ```
   */
  module.directive('kibiTableRow', function ($compile, kibiState, kbnUrl, $route, $window, createNotifier, Private, courier) {
    var noWhiteSpace = require('ui/utils/no_white_space');

    var openRowHtml = require('ui/doc_table/components/table_row/open.html');
    var detailsHtml = require('ui/doc_table/components/table_row/details.html');
    var cellTemplate = _.template(noWhiteSpace(require('ui/kibi/kibi_doc_table/components/kibi_table_row/cell.html')));
    var truncateByHeightTemplate = _.template(noWhiteSpace(require('ui/partials/truncate_by_height.html')));

    var notify = createNotifier({
      location: 'Enhanced search results'
    });

    return {
      restrict: 'A',
      scope: {
        columns: '=',
        filter: '=',
        indexPattern: '=',
        row: '=kibiTableRow',
        // kibi: associate an action when clicking on a cell
        cellClickHandlers: '='
      },
      link: function ($scope, $el, attrs) {
        $el.after('<tr>');
        $el.empty();

        var init = function () {
          createSummaryRow($scope.row, $scope.row._id);
        };

        // when we compile the details, we use this $scope
        var $detailsScope;

        // when we compile the toggle button in the summary, we use this $scope
        var $toggleScope;

        // toggle display of the rows details, a full list of the fields from each row
        $scope.toggleRow = function () {
          var $detailsTr = $el.next();

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
          var indexPattern = $scope.indexPattern;

          // We just create a string here because its faster.
          var newHtmls = [
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

          var $cells = $el.children();

          // kibi: entity selection
          $el.children('[data-column]')
            .removeClass('selectedEntityCell disabled')
            .css('cursor', 'auto')
            .off('click');

          newHtmls.forEach(function (html, i) {
            var $cell = $cells.eq(i);
            // kibi: cell actions
            var column = $cell.data('column');

            // Remove click CSS style for every cell
            $cell.removeClass('click');

            if ($scope.cellClickHandlers && $scope.cellClickHandlers[column]) {

              _.each($scope.cellClickHandlers[column], function (clickHandler) {

                var type = clickHandler.type;

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
                    var valueField = clickHandler.valueField;
                    var idValue = row.$$_flattened[valueField];
                    var uriFormat = clickHandler.uriFormat;

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
                    var win;
                    if (uriFormat.trim() === '@URL@') {
                      win = $window.open(idValue, '_blank');
                    } else {
                      win = $window.open(uriFormat.replace(/@URL@/g, encodeURIComponent(idValue)), '_blank');
                    }
                    if (win) {
                      win.focus();
                    }

                  } else if (type === 'select') {
                    var entityId = row.$$_flattened._index + '/' +
                      row.$$_flattened._type + '/' +
                      row.$$_flattened._id + '/' +
                      column;

                    kibiState.disableSelectedEntity(false);
                    kibiState.setEntityURI(entityId);
                    kibiState.save();

                    // switch to different dashboard only if user gave one in settings
                    var targetDashboardId = clickHandler.targetDashboardId;
                    if (targetDashboardId) {
                      kbnUrl.change('/dashboard/{{id}}', {id:  targetDashboardId});
                    } else {
                      // Call courier.fetch to update visualizations
                      // This will update all the visualisations, not only the one
                      // which strictly depend on selected entityURI
                      courier.fetch();
                    }
                  }

                });

              });

            }

            if ($cell.data('discover:html') === html) return;

            var reuse = _.find($cells.slice(i + 1), function (cell) {
              return $.data(cell, 'discover:html') === html;
            });

            var $target = reuse ? $(reuse).detach() : $(html);
            $target.data('discover:html', html);
            var $before = $cells.eq(i - 1);
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
        function _displayField(row, fieldName, breakWords) {
          var indexPattern = $scope.indexPattern;
          var text = indexPattern.formatField(row, fieldName);

          if (breakWords) {
            text = addWordBreaks(text, MIN_LINE_LENGTH);

            if (text.length > MIN_LINE_LENGTH) {
              return truncateByHeightTemplate({
                body: text
              });
            }
          }

          return text;
        }

        init();
      }
    };
  });
});
