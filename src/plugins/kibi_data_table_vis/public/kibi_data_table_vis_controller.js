define(function (require) {
  var module = require('ui/modules').get('kibana/kibi_data_table_vis', ['kibana']);
  var _ = require('lodash');

  require('ui/kibi/directives/kibi_param_entity_uri');
  require('ui/kibi/kibi_doc_table/kibi_doc_table');

  module.controller(
    'KibiDataTableVisController',
    function ($rootScope, $scope, $route, globalState, savedVisualizations, Private, courier) {
      var urlHelper = Private(require('ui/kibi/helpers/url_helper'));
      var requestQueue = Private(require('ui/kibi/components/courier/_request_queue_wrapped'));
      var SearchSource = Private(require('ui/courier/data_source/search_source'));
      var filterManager = Private(require('ui/filter_manager'));
      var fieldFormats = Private(require('ui/registry/field_formats'));
      var VirtualIndexPattern = Private(require('ui/kibi/components/commons/virtual_index_pattern'));

      $scope.queryColumn = {};
      $scope.cellClickHandlers = {};

      $scope.entityURI = '';

      const configMode = urlHelper.onVisualizeTab();

      function setEntityURI() {
        if (configMode && globalState.se_temp && globalState.se_temp.length > 0) {
          $scope.entityURI = globalState.se_temp[0];
        } else if (!configMode && globalState.se && globalState.se.length > 0) {
          $scope.entityURI = globalState.se[0];
        } else {
          $scope.entityURI = '';
        }
      }
      setEntityURI();

      var saveWithChangesHandler = function (diff) {
        if (diff.indexOf('se') !== -1 || diff.indexOf('se_temp') !== -1) {
          setEntityURI();
          fetchResults($scope.savedVis);
        }
      };
      globalState.on('save_with_changes', saveWithChangesHandler.bind(this));

      // Set to true in editing mode
      var editing = false;

      $scope.savedVis = $route.current.locals.savedVis;
      if ($scope.savedVis) {
        editing = true;
      } else {
        //NOTE: reloading the visualization to get the searchSource,
        // which would otherwise be unavailable by design
        savedVisualizations.get($scope.vis.id)
        .then(function (savedVis) {
          $scope.savedVis = savedVis;
        });
      }

      // NOTE: filter to enable little icons in doc-viewer to filter and add/remove columns
      $scope.filter = function (field, value, operator) {
        //here grab the index
        var index = $scope.savedObj.searchSource.get('index').id;
        filterManager.add(field, value, operator, index);
      };

      var _constructCellOnClicksObject = function () {
        $scope.cellClickHandlers = {};
        var handler;
        _.each($scope.vis.params.clickOptions, function (clickHandler) {
          handler = $scope.cellClickHandlers[clickHandler.columnField];
          if (typeof handler === 'undefined') {
            $scope.cellClickHandlers[clickHandler.columnField] = [];
          }
          $scope.cellClickHandlers[clickHandler.columnField].push(clickHandler);
        });
      };
      _constructCellOnClicksObject();

      var _constructQueryColumnObject = function () {
        if ($scope.vis.params.enableQueryFields === true && $scope.vis.params.queryFieldName) {
          $scope.queryColumn.name = $scope.vis.params.queryFieldName;
          $scope.queryColumn.queryDefinitions = $scope.vis.params.queryDefinitions;
        } else {
          $scope.queryColumn = {};
        }
      };
      _constructQueryColumnObject();

      var _id = '_kb_table_ids_source_flag' + $scope.vis.id;
      function fetchResults(savedVis) {

        var indexPattern = $scope.vis.indexPattern;

        if ($scope.savedObj && $scope.savedObj.searchSource) {
          $scope.savedObj.searchSource.destroy();
        }
        requestQueue.markAllRequestsWithSourceIdAsInactive(_id);

        var searchSource = new SearchSource();
        searchSource.inherits(savedVis.searchSource);

        searchSource._id = _id;
        searchSource.index(indexPattern);

        var sourceFiltering = indexPattern.getSourceFiltering();
        if (sourceFiltering && sourceFiltering.all) {
          searchSource.source(sourceFiltering.all);
        }

        // validate here and do not inject if all require values are not set
        if ($scope.vis.params.enableQueryFields === true && $scope.vis.params.queryDefinitions.length > 0 &&
          $scope.vis.params.joinElasticsearchField && $scope.vis.params.joinElasticsearchField !== '' &&
          $scope.vis.params.queryFieldName && $scope.vis.params.queryFieldName !== '') {
          var virtualIndexPattern = new VirtualIndexPattern(indexPattern);
          searchSource.index(virtualIndexPattern);

          searchSource.inject([
            {
              entityURI: $scope.entityURI,
              queryDefs: $scope.vis.params.queryDefinitions,
              sourcePath: $scope.vis.params.joinElasticsearchField, // it is the field from table to do the comparison
              fieldName: $scope.vis.params.queryFieldName
            }
          ]);

          var injectedField = {
            analyzed: false,
            bucketable: true,
            count: 0,
            displayName: $scope.vis.params.queryFieldName,
            name: $scope.vis.params.queryFieldName,
            scripted: false,
            sortable: false,
            type: 'string',
            format: fieldFormats.getDefaultInstance('string')
          };
          virtualIndexPattern.addVirtualField(injectedField);
        }

        $scope.savedObj = {
          searchSource: searchSource,
          columns: ['_source']
        };

        var columns;

        if (savedVis.savedSearch) {
          $scope.savedObj.sort = savedVis.savedSearch.sort;
          columns = $scope.vis.params.columns ? $scope.vis.params.columns : savedVis.savedSearch.columns;
        } else {
          columns = $scope.vis.params.columns ? $scope.vis.params.columns : ['_source'];
        }

        $scope.savedObj.columns = columns;

        courier.fetch();
      }

      $scope.$watch('savedVis', function () {
        if ($scope.savedVis) {
          fetchResults($scope.savedVis);
        }
      });

      // when autoupdate is on we detect the refresh here
      $scope.$watch('esResponse', function () {
        if ($scope.savedObj && $scope.savedObj.searchSource) {
          $scope.savedObj.searchSource.fetchQueued();
        }
      });

      if (editing) {
        var removeVisStateChangedHandler = $rootScope.$on('kibi:vis:state-changed', function () {
          _constructQueryColumnObject();
          _constructCellOnClicksObject();
          fetchResults($scope.savedVis);
        });

        var removeVisColumnsChangedHandler = $rootScope.$on('kibi:vis:columns-changed', function (event, columns) {
          if ($scope.savedObj && $scope.savedObj.columns) {
            $scope.savedObj.columns = columns;
          }
        }, true);

        $scope.$on('$destroy', function () {
          removeVisStateChangedHandler();
          removeVisColumnsChangedHandler();
          globalState.off('save_with_changes', saveWithChangesHandler);
        });

        $scope.$watch('savedObj.columns', function () {
          $rootScope.$emit('kibi:vis:savedObjectColumns-changed', $scope.savedObj);
        });

      }

    });
});
