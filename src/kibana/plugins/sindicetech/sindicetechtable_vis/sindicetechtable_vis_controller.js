define(function (require) {
  var module = require('modules').get('kibana/sindicetechtable_vis', ['kibana']);
  var rison = require('utils/rison');
  var _ = require('lodash');

  require('components/sindicetech/st_doc_table/st_doc_table');

  module.controller(
    'KbnSindicetechtableVisController',
    function ($rootScope, $scope, $location, $route, globalState, savedVisualizations, Private, courier) {
      var requestQueue = Private(require('components/courier/_request_queue'));
      var SearchSource = Private(require('components/courier/data_source/search_source'));
      var filterManager = Private(require('components/filter_manager/filter_manager'));
      var fieldFormats = Private(require('registry/field_formats'));
      var VirtualIndexPattern = Private(require('components/kibi/virtual_index_pattern/virtual_index_pattern'));

      var _set_entity_uri =  Private(require('plugins/kibi/commons/_set_entity_uri'));

      $scope.queryColumn = {};
      $scope.cellClickHandlers = {};

      $scope.holder = {
        entityURI: '',
        entityURIEnabled: false,
        visible: $location.path().indexOf('/visualize/') !== -1
      };
      $scope.$watch('holder.entityURI', function (entityURI) {
        if (entityURI && $scope.holder.visible) {
          globalState.se_temp = [entityURI];
          globalState.save();
          fetchResults($scope.savedVis);
        }
      });

      _set_entity_uri($scope.holder);
      var removeSetEntityUriHandler = $rootScope.$on('kibi:selectedEntities:changed', function (event, se) {
        _set_entity_uri($scope.holder);
      });

      $scope.refresh = function () {
        fetchResults($scope.savedVis);
      };

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
            $scope.vis = savedVis.vis;
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
          $scope.queryColumn.queryIds = $scope.vis.params.queryIds;
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

        // validate here and do not inject if all require values are not set
        if ($scope.vis.params.enableQueryFields === true &&
          $scope.vis.params.queryIds && $scope.vis.params.queryIds.length > 0 &&
          $scope.vis.params.joinElasticsearchField && $scope.vis.params.joinElasticsearchField !== '' &&
          $scope.vis.params.queryFieldName && $scope.vis.params.queryFieldName !== ''
        ) {

          var virtualIndexPattern = new VirtualIndexPattern(indexPattern);
          searchSource.index(virtualIndexPattern);

          searchSource.inject([
            {
              entityURI: $scope.holder.entityURI,
              queryDefs: $scope.vis.params.queryIds, //TODO: rename to queryDefs
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

      $scope.$watch('vis', function () {
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

      var removeEntityURIEnableHandler = $rootScope.$on('kibi:entityURIEnabled:kibitable', function (event, entityURIEnabled) {
        $scope.holder.entityURIEnabled = entityURIEnabled;
      });
      $scope.$on('$destroy', function () {
        removeSetEntityUriHandler();
        removeEntityURIEnableHandler();
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
        });

        $scope.$watch('savedObj.columns', function () {
          $rootScope.$emit('kibi:vis:savedObjectColumns-changed', $scope.savedObj);
        });

      }

    });
});
