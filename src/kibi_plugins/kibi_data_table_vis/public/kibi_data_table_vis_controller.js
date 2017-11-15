import DashboardHelperProvider from 'ui/kibi/helpers/dashboard_helper';
import * as columnsActions from './actions/columns';
import FilterManagerProvider from 'ui/filter_manager';
import { onVisualizePage } from 'ui/kibi/utils/on_page';
import _ from 'lodash';
import 'ui/kibi/directives/kibi_param_entity_uri';
import uiModules from 'ui/modules';

// allow to query external datasources for populating a column
import 'ui/kibi/components/query_engine_client/query_engine_client';
import VirtualIndexPatternProvider from 'ui/kibi/components/commons/virtual_index_pattern';

function KibiDataTableVisController(getAppState, courier, $window, createNotifier, confirmModal,
  kibiState, $rootScope, $scope, Private, config) {
  const dashboardHelper = Private(DashboardHelperProvider);
  const VirtualIndexPattern = Private(VirtualIndexPatternProvider);
  const filterManager = Private(FilterManagerProvider);
  const configMode = onVisualizePage();
  const notify = createNotifier({
    location: 'Enhanced search results'
  });

  $scope.customView = Boolean($scope.vis.params.templateId);
  $scope.showCustomView = Boolean($scope.vis.params.templateId);

  /**
   * extract fields from query
   *
   * @param query string a query_string query
   * @returns a list of fields occuring in the query
   */
  function extractFieldsFromQuery(query) {
    const fieldRegex = /([^\s]+)([\s]+)*:/g;
    let match;
    const fields = [];
    while (match = fieldRegex.exec(query)) {
      fields.push(match[1].replace(/[\s]*:/g, ''));
    }
    return fields;
  }

  // check if there are no results and the search contains an alias set
  $scope.$watch('hits', hits => {
    if (hits && hits.length === 0) {
      const $state = getAppState();
      const fields = extractFieldsFromQuery($state.query.query_string.query);
      _.each(fields, function (field) {
        if (_.contains($scope.vis.params.columnAliases, field) && !(_.contains($scope.vis.params.columns, field))) {
          const alias = $scope.vis.params.columns[_.indexOf($scope.vis.params.columnAliases, field)];
          return notify.warning(`You seem to be using an alias: [${field}]. The actual field name you probably want is: [${alias}]`);
        }
      });
    }
  });

  // kibi: Need to watch pageSize in case the parameter is removed ( = set to null) in the editor manually
  $scope.$watch('vis.params.pageSize', pageSize => {
    if (!pageSize) {
      $scope.vis.params.pageSize = config.get('discover:sampleSize');
    }
  });

  // NOTE: filter to enable little icons in doc-viewer to filter and add/remove columns
  $scope.filter = function (field, value, operator) {
    // here grab the index
    const index = $scope.searchSource.get('index').id;
    filterManager.add(field, value, operator, index);
  };

  const _populateClickHandlers = function () {
    const clickOptions = _.groupBy($scope.vis.params.clickOptions, 'columnField');

    $scope.cellClickHandlers = function (row, column) {
      let hasSelectedEntity = false;
      const clickHandlers = [];

      if (clickOptions[column]) {
        _.each(clickOptions[column], clickOption => {
          switch (clickOption.type) {
            case 'select':
              const { _index, _type, _id } = row;

              hasSelectedEntity = kibiState.isEntitySelected(_index, _type, _id, column);

              clickHandlers.push(function () {
                const entity = {
                  index: _index,
                  type: _type,
                  id: _id,
                  column
                };

                kibiState.disableSelectedEntity(false);
                kibiState.setEntityURI(entity);
                kibiState.save();

                // switch to a different dashboard only if user gave one in settings
                const { targetDashboardId } = clickOption;
                if (targetDashboardId) {
                  return dashboardHelper.switchDashboard(targetDashboardId);
                } else {
                  // Call courier.fetch to update visualizations
                  // This will update all the visualisations, not only the one
                  // which strictly depend on selected entityURI
                  courier.fetch();
                }
              });
              break;
            case 'link':
              clickHandlers.push(function () {
                const { valueField, uriFormat } = clickOption;
                let idValue = row[valueField];

                // Check if idValue is an array; if so, use the first
                // element of the array as the value and display a warning
                if (idValue instanceof Array && idValue.length > 0) {
                  notify.warning(
                    `Field [${valueField}] used in an click handler contains more than one value. The first value will be used.`
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
              });
              break;
            default:
              notify.error(`Unknown click action of type ${clickOption.type} on the column ${column}`);
          }
        });
      }

      const clickHandlersFn = function () {
        for (const fn of clickHandlers) {
          fn();
        }
      };

      const ret = {
        hasSelectedEntity,
        isSelectedEntityDisabled: hasSelectedEntity && kibiState.isSelectedEntityDisabled(),
      };
      if (clickHandlers.length) {
        ret.clickHandler = clickHandlersFn;
      }
      return ret;
    };
  };
  _populateClickHandlers();

  function _hasRelationalColumn() {
    return Boolean($scope.vis.params.queryFieldName);
  }

  $scope.$listen(kibiState, 'save_with_changes', function (diff) {
    if (diff.indexOf(kibiState._properties.selected_entity) !== -1 ||
        diff.indexOf(kibiState._properties.selected_entity_disabled) !== -1 ||
        diff.indexOf(kibiState._properties.test_selected_entity) !== -1) {
      if (_hasRelationalColumn()) {
        if (kibiState.isSelectedEntityDisabled()) {
          delete $scope.searchSource.get('inject')[0].entityURI;
        } else {
          $scope.searchSource.get('inject')[0].entityURI = kibiState.getEntityURI();
        }
      }
    }
  });

  const _addRelationalColumn = function () {
    if (!_hasRelationalColumn()) {
      return;
    }
    const indexPattern = $scope.searchSource.get('index');
    // index does not exists so it is imposible to grab the field to configure the column
    if (!indexPattern) {
      return;
    }
    const { queryFieldName: name, queryDefinitions, joinElasticsearchField } = $scope.vis.params;

    // Field does not exists Can happen when index pattern is defined but index was deleted
    if (indexPattern.fields.length === 0 || !indexPattern.fields.byName[joinElasticsearchField]) {
      return;
    }

    const virtualField = {
      count: 0,
      displayName: name,
      name,
      type: 'string'
    };
    const virtualIndexPattern = new VirtualIndexPattern(indexPattern, virtualField);
    $scope.searchSource.index(virtualIndexPattern);

    const relationalColumn = {
      queryDefs: queryDefinitions,
      // it is the field from table to do the comparison
      sourcePath: indexPattern.fields.byName[joinElasticsearchField].path,
      fieldName: name
    };
    if (!kibiState.isSelectedEntityDisabled()) {
      relationalColumn.entityURI = kibiState.getEntityURI();
    }
    $scope.searchSource.inject([ relationalColumn ]);
  };
  _addRelationalColumn();

  // when autoupdate is on we detect the refresh here for template visualization
  $scope.$watch('esResponse', function (resp) {
    if (resp && $scope.searchSource) {
      $scope.searchSource.fetchQueued();
    }
  });

  $scope.sorting = $scope.uiState.get('sort', [ '_score', 'desc' ]);
  $scope.uiState.on('change', function () {
    $scope.sorting = $scope.uiState.get('sort');
  });

  $scope.onChangeSortOrder = function (columnName, newDirection) {
    $scope.uiState.set('sort', [ columnName, newDirection ]);
  };

  $scope.$watch('sorting', sorting => {
    if ($scope.customView && $scope.showCustomView) {
      $scope.uiState.setSilent('sort', sorting);
    }
  });
  $scope.onAddColumn = function (columnName) {
    columnsActions.addColumn($scope.vis.params, columnName);
    $rootScope.$emit('kibi:column:add', columnName);
  };

  $scope.onRemoveColumn = function (columnName) {
    const _doRemove = function () {
      columnsActions.removeColumn($scope.vis.params, columnName);
      $rootScope.$emit('kibi:column:remove', columnName);
    };

    // check if there is any click actions / relational column definition
    // before removing a column of the table
    if ($scope.vis.params.enableQueryFields && columnName === $scope.vis.params.queryFieldName) {
      confirmModal(
        `Are you sure you want to remove the relational column "${columnName}" ?`, {
          confirmButtonText: 'Yes, remove the column',
          onConfirm: () => {
            $rootScope.$emit('disableQueryFields');
            _doRemove();
          }
        }
      );
      return;
    }

    const clicks = _.sum($scope.vis.params.clickOptions, 'columnField', columnName);
    if (clicks > 0) {
      const plural = clicks > 1;
      confirmModal(
        `There ${plural ? 'are' : 'is'} ${clicks} click action${plural ? 's' : ''} configured with the ${columnName} column.`, {
          confirmButtonText: 'Yes, remove the column',
          onConfirm: () => {
            $rootScope.$emit('removeClickOptions', columnName);
            _doRemove();
          }
        }
      );
      return;
    }

    _doRemove();
  };

  $scope.onMoveColumn = function (columnName, newIndex) {
    columnsActions.moveColumn($scope.vis.params, columnName, newIndex);
    $rootScope.$emit('kibi:column:move', columnName, newIndex);
  };

  $scope.$watch('vis.params.templateId', function (templateId) {
    $scope.customViewerMode = 'record';
    $scope.customView = Boolean(templateId);
    $scope.showCustomView = Boolean(templateId);
  });

  if (configMode) {
    $scope.$watch('vis.params.clickOptions', () => {
      _populateClickHandlers();
    }, true);

    $scope.$watchMulti([ 'vis.params.queryFieldName', 'vis.params.joinElasticsearchField', '[]vis.params.queryDefinitions' ], () => {
      _addRelationalColumn();
    });
  }
}

uiModules
.get('kibana/kibi_data_table_vis', ['kibana'])
.controller('KibiDataTableVisController', KibiDataTableVisController);
