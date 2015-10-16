define(function (require) {
  var _ = require('lodash');
  var $ = require('jquery');
  var addWordBreaks = require('utils/add_word_breaks');
  var noWhiteSpace = require('utils/no_white_space');
  var module = require('modules').get('app/discover');

  require('components/highlight/highlight');
  require('components/highlight/highlight_tags');
  require('components/doc_viewer/doc_viewer');
  require('filters/trust_as_html');
  require('filters/short_dots');


  // guestimate at the minimum number of chars wide cells in the table should be
  var MIN_LINE_LENGTH = 20;

  /**
   * kbnTableRow directive
   *
   * Display a row in the table
   * ```
   * <tr ng-repeat="row in rows" kbn-table-row="row"></tr>
   * ```
   */
  module.directive(
    'stKbnTableRow',
    function ($rootScope, $compile, highlightTags, globalState, kbnUrl, $route, $window, Notifier, Private, courier) {
    var noWhiteSpace = require('utils/no_white_space');

    var openRowHtml = require('text!components/doc_table/components/table_row/open.html');
    var detailsHtml = require('text!components/doc_table/components/table_row/details.html');
    var cellTemplate = _.template(noWhiteSpace(require('text!components/sindicetech/st_doc_table/components/st_table_row/st_cell.html')));
    var truncateByHeightTemplate = _.template(noWhiteSpace(require('text!partials/truncate_by_height.html')));

    var fieldFormats = Private(require('registry/field_formats'));
    var _isInSelectedEntities = Private(require('components/sindicetech/st_doc_table/components/_is_this_entity_in_selected_entities'));

    var notify = new Notifier({
      location: 'Enhanced search results'
    });

    return {
      restrict: 'A',
      scope: {
        columns: '=',
        filter: '=',
        indexPattern: '=',
        row: '=stKbnTableRow',
        cellClickHandlers: '='
      },
      link: function ($scope, $el, attrs) {
        $el.after('<tr>');
        $el.empty();

        var init = function () {
          createSummaryRow($scope.row);
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

        $scope.$watch('columns', function () {
          createSummaryRow($scope.row);
        }, true);

        $scope.$watch('cellClickHandlers', function () {
          createSummaryRow($scope.row);
        }, true);

        globalState.on('save_with_changes', function (diff) {
          if (diff.indexOf('entityDisabled') !== -1 || diff.indexOf('se') !== -1 ) {
            createSummaryRow($scope.row);
          }
        });

        $scope.$watch('row', function () {
          createSummaryRow($scope.row);
        }, true);

        $scope.$watchMulti(['indexPattern.timeFieldName', 'row.highlight'], function () {
          createSummaryRow($scope.row);
        });

        var off = $rootScope.$on('kibi:selectedEntities:changed', function () {
          createSummaryRow($scope.row);
        });
        $scope.$on('$destroy', off);

        // create a tr element that lists the value for each *column*
        function createSummaryRow(row) {
          _formatRow(row);
          // We just create a string here because its faster.
          var newHtmls = [
            openRowHtml
          ];

          if ($scope.indexPattern.timeFieldName) {
            newHtmls.push(cellTemplate({
              timefield: true,
              formatted: _displayField(row, $scope.indexPattern.timeFieldName),
              column: null
            }));
          }

          $scope.columns.forEach(function (column) {
            newHtmls.push(cellTemplate({
              timefield: false,
              sourcefield: (column === '_source'),
              formatted: _displayField(row, column, true),
              column: column
            }));
          });

          var $cells = $el.children();

          $el.children('[data-column]')
            .removeClass('selectedEntityCell disabled')
            .css('cursor', 'auto')
            .off('click');

          newHtmls.forEach(function (html, i) {
            var $cell = $cells.eq(i);
            var column = $cell.data('column');

            if ($scope.cellClickHandlers && $scope.cellClickHandlers[column]) {

              _.each($scope.cellClickHandlers[column], function (clickHandler) {

                var type = clickHandler.type;

                // Style the cell value as a link
                $cell.addClass('click');

                if (globalState.se && globalState.se.length > 0 && type === 'select' &&
                    _isInSelectedEntities(globalState.se, row.$$_partialFormatted._id, column)
                ) {
                  if (globalState.entityDisabled === true) {
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
                    var entityId = row.$$_partialFormatted._index + '/' +
                                   row.$$_partialFormatted._type + '/' +
                                   row.$$_partialFormatted._id + '/' +
                                   column;

                    if (!globalState.se) {
                      globalState.se = [];
                    }
                    if (globalState.se.indexOf(entityId) === -1) {

                      // this is to make sure only one gets selected for now
                      // to allow multiple selection simpy remove the line below
                      globalState.se = [];

                      globalState.se.push(entityId);
                      globalState.entityDisabled = false;
                      globalState.save();
                    }

                    // switch to different dashboard only if user gave one in settings
                    var targetDashboardId = clickHandler.targetDashboardId;
                    if (targetDashboardId && targetDashboardId !== '') {
                      kbnUrl.change('dashboard/' + targetDashboardId);
                      $route.reload();
                    } else {
                      // as there is no need for reload just broadcast the change
                      $rootScope.$emit('kibi:selectedEntities:changed', globalState.se);

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

        /*
         * Format a field with the index pattern on scope.
         */
        function _formatField(value, name) {
          var defaultFormat = fieldFormats.getDefaultInstance('string');
          var field = $scope.indexPattern.fields.byName[name];
          var formatter = (field && field.format) ? field.format : defaultFormat;

          return formatter.convert(value);
        }

        /*
         * Create the $$_partialFormatted key on a row
         * added by kibi to make sure the injected column works
         */
        function _formatRow(row) {
          row.$$_flattened = row.$$_flattened || $scope.indexPattern.flattenHit(row);
          row.$$_partialFormatted = row.$$_partialFormatted || _.mapValues(row.$$_flattened, _formatField);

          // kibi: take care of arrays which were not flatten
          for (var key in row.$$_flattened) {
            if (row.$$_flattened.hasOwnProperty(key)) {
              var value = row.$$_flattened[key];
              if (value instanceof Array && value.length > 0) {
                var flattenedArray = [];
                _st_flatten(key, value, flattenedArray);
                // Now rewrite the flattend properties into row.$$_formatted so they can be displayed
                for (var f in flattenedArray) {
                  if (flattenedArray.hasOwnProperty(f)) {
                    row.$$_partialFormatted[f] = flattenedArray[f].join(', ');
                  }
                }

              }
            }
          }
          // kibi end
          return row.$$_partialFormatted;
        }

        // added by kibi
        function _st_flatten(key, o, flattenedArray) {
          if (o instanceof Array) {
            _.each(o, function (item) {
              _st_flatten(key, item, flattenedArray);
            });
          } else if (typeof o === 'object') {
            for (var oKey in o) {
              if (o.hasOwnProperty(oKey)) {
                _st_flatten(key + '.' + oKey, o[oKey], flattenedArray);
              }
            }
          } else {
            // prymitive
            if (!flattenedArray[key]) {
              flattenedArray[key] = [];
            }
            flattenedArray[key].push(o);
          }
        }
        // kibi end

        init();
      }
    };
  });
});
