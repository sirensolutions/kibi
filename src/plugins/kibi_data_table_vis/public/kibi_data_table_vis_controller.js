define(function (require) {
  const module = require('ui/modules').get('kibana/kibi_data_table_vis', ['kibana']);
  const _ = require('lodash');

  require('ui/kibi/directives/kibi_param_entity_uri');
  require('ui/kibi/kibi_doc_table/kibi_doc_table');

  module.controller('KibiDataTableVisController', function ($rootScope, $scope, Private) {
    const chrome = require('ui/chrome');
    const filterManager = Private(require('ui/filter_manager'));
    const configMode = chrome.onVisualizeTab();

    $scope.queryColumn = {};
    $scope.cellClickHandlers = {};
    $scope.savedObj = {
      columns: $scope.vis.params.columns,
      columnAliases: $scope.vis.params.columnAliases,
      templateId: $scope.vis.params.templateId,
      sort: $scope.vis.params.sort
    };

    // NOTE: filter to enable little icons in doc-viewer to filter and add/remove columns
    $scope.filter = function (field, value, operator) {
      //here grab the index
      const index = $scope.searchSource.get('index').id;
      filterManager.add(field, value, operator, index);
    };

    const _constructCellOnClicksObject = function () {
      $scope.cellClickHandlers = {};
      _.each($scope.vis.params.clickOptions, function (clickHandler) {
        if (!$scope.cellClickHandlers[clickHandler.columnField]) {
          $scope.cellClickHandlers[clickHandler.columnField] = [];
        }
        $scope.cellClickHandlers[clickHandler.columnField].push(clickHandler);
      });
    };
    _constructCellOnClicksObject();

    const _constructQueryColumnObject = function () {
      if ($scope.vis.params.enableQueryFields === true && $scope.vis.params.queryFieldName) {
        $scope.queryColumn = {
          name: $scope.vis.params.queryFieldName,
          queryDefinitions: $scope.vis.params.queryDefinitions,
          joinElasticsearchField: $scope.vis.params.joinElasticsearchField
        };
      } else {
        $scope.queryColumn = {};
      }
    };
    _constructQueryColumnObject();

    // when autoupdate is on we detect the refresh here for template visualization
    $scope.$watch('esResponse', function (resp) {
      if (resp && $scope.searchSource) {
        $scope.searchSource.fetchQueued();
      }
    });

    if (configMode) {
      const removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
        _constructQueryColumnObject();
        _constructCellOnClicksObject();
        $scope.searchSource.fetchQueued();
      });

      const removeVisColumnsChangedHandler = $rootScope.$on('kibi:vis:columns-changed', function (event, columns) {
        if (columns) {
          $scope.savedObj.columns = columns;
        }
      });

      const removeVisColumnAliasesChangedHandler = $rootScope.$on('kibi:vis:columnAliases-changed', function (event, columnAliases) {
        if (columnAliases) {
          $scope.savedObj.columnAliases = columnAliases;
        }
      });

      const removeVisTemplateIdChangedHandler = $rootScope.$on('kibi:vis:templateId-changed', function (event, templateId) {
        $scope.savedObj.templateId = templateId;
        $scope.customViewerMode = 'record';
      });

      $scope.$on('$destroy', function () {
        removeVisStateChangedHandler();
        removeVisColumnsChangedHandler();
        removeVisTemplateIdChangedHandler();
      });

      $scope.$watch('savedObj.columns', function () {
        $rootScope.$emit('kibi:vis:savedObjectColumns-changed', $scope.savedObj);
      });
    }

  });
});
