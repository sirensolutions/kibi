define(function (require) {
  var _ = require('lodash');

  require('modules').get('kibana/sindicetechtable_vis')
  .directive('sindicetechtableVisParams', function ($http, config, $rootScope,
                                                    $route, Private, Notifier, savedQueries, savedSearches, $window) {

    var notify = new Notifier({
      location: 'Enhanced search results'
    });

    return {
      restrict: 'E',
      template: require('text!plugins/sindicetech/sindicetechtable_vis/sindicetechtable_vis_params.html'),
      link: function ($scope) {
        var _shouldEntityURIBeEnabled = Private(require('plugins/kibi/commons/_should_entity_uri_be_enabled'));
        var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

        // Saved visualization

        // Initialize columns
        $scope.savedVis = $route.current.locals.savedVis;

        if (typeof $scope.vis.params.columns === 'undefined') {
          if ($scope.savedVis.savedSearch) {
            $scope.vis.params.columns = _.clone($scope.savedVis.savedSearch.columns);
          } else {
            $scope.vis.params.columns = ['_source'];
          }
        }

        // ======
        // Events
        // ======

        // Emit an event when state changes
        $scope.$watch('vis.dirty', function () {
          if ($scope.vis.dirty === false) {
            $rootScope.$emit('kibi:vis:state-changed');
          }
        });

        // ====================================
        // Visualization controller integration
        // ====================================

        var shouldEntityURIBeEnabled = function () {
          // examine all used queries in order to check if any of them require entityURI
          var queryIds = _.map($scope.vis.params.queryIds, function (snippet) {
            return snippet.queryId;
          });

          _shouldEntityURIBeEnabled(queryIds).then(function (value) {
            if ($scope.vis.params.enableQueryFields === true) {
              $rootScope.$emit('kibi:entityURIEnabled:kibitable', value);
            } else {
              $rootScope.$emit('kibi:entityURIEnabled:kibitable', false);
            }
          }).catch(function (err) {
            notify.warning('Could not determine whether the widget needs an entityURI' +
                ' to be set: ' + JSON.stringify(err, null, ' '));
          });
        };

        $scope.$watch('vis.params.queryIds', function () {
          shouldEntityURIBeEnabled();
        }, true);

        // check if there is any click actions / relational column definition
        // before removing a column of the table
        var removeRemoveColumnHandler = $rootScope.$on('kibi:remove:column', function (event, column) {
          if (column) {
            var msg;

            if ($scope.vis.params.enableQueryFields && column.fieldName === $scope.vis.params.queryFieldName) {
              msg = 'Are you sure you want to remove the relational column "' +
              column.fieldName + '" ?';
              if ($window.confirm(msg)) {
                $scope.vis.params.enableQueryFields = false;
              } else {
                $rootScope.$emit('kibi:add:column', column);
              }
              return;
            }

            var clicks = 0;
            _.each($scope.vis.params.clickOptions, function (clickOption) {
              if (clickOption.columnField === column.fieldName) {
                clicks++;
              }
            });
            if (clicks > 0) {
              msg = 'There ' + (clicks === 1 ? 'is 1' : 'are ' + clicks) +
                ' click actions configured with the ' + column.fieldName + ' column. Are you sure to remove it ?';
              if ($window.confirm(msg)) {
                _.remove($scope.vis.params.clickOptions, function (clickOption) {
                  return clickOption.columnField === column.fieldName;
                });
              } else {
                // add the column back
                $rootScope.$emit('kibi:add:column', column);
              }
            }
          }
        });

        // Point savedObject.columns to vis.params.columns
        var removeSavedObjectColumnsChangedHandler = $rootScope.$on('kibi:vis:savedObjectColumns-changed',
            function (event, savedObject) {
          if (savedObject && savedObject.columns !== $scope.vis.params.columns) {
            savedObject.columns = $scope.vis.params.columns;
          }
        });

        $scope.$on('$destroy', function () {
          removeRemoveColumnHandler();
          removeSavedObjectColumnsChangedHandler();
        });

        // Need to emit an event to update table columns while visualization
        // is dirty
        $scope.$watch('vis.params.columns', function () {
          $rootScope.$emit('kibi:vis:columns-changed', $scope.vis.params.columns);
        }, true);

        // =======
        // Queries
        // =======

        var previousName = null;
        $scope.$watch('vis.params.queryFieldName', function () {
          if (!$scope.vis.params.queryFieldName) {
            return;
          }
          var name = $scope.vis.params.queryFieldName;
          var i = -1;
          if (previousName) {
            i = $scope.vis.params.columns.indexOf(previousName);
            if (i > -1) {
              $scope.vis.params.columns.splice(i, 1, name);
            }
          } else {
            i = $scope.vis.params.columns.indexOf(name);
            if (i === -1) {
              $scope.vis.params.columns.push(name);
            }
          }
          previousName = name;
        });

        $scope.$watch('vis.params.enableQueryFields', function () {
          if ($scope.vis.params.enableQueryFields !== true) {
            if (previousName) {
              var i = $scope.vis.params.columns.indexOf(previousName);
              if (i > -1) {
                $scope.vis.params.columns.splice(i, 1);
              }
            }
            previousName = null;
            delete $scope.vis.params.enableQueryFields;
            delete $scope.vis.params.joinElasticsearchField;
            if ($scope.vis.params.queryIds) {
              $scope.vis.params.queryIds.length = 0;
            }
            delete $scope.vis.params.queryFieldName;
            $scope.vis.dirty = true;
          }
          shouldEntityURIBeEnabled();
        });

        $scope.$watchMulti([
          'vis.params.showMeticsAtAllLevels',
          'vis.params.datasourceId',
          'vis.params.queryIds'
        ], function () {
          if (!$scope.vis) return;
          _.each(config.file.datasources, function (datasource) {
            if (datasource.id === $scope.vis.params.datasourceId) {
              $scope.datasourceType = datasource.type;
              return false;
            }
          });
        });

        // =========================
        // Click handlers
        // =========================

        // holds option validation status
        $scope.clickHandlerValidationStates = [];

        // Initialise the clicks parameters.
        var clickHandlersChanged = $scope.clickHandlersChanged = function () {
          _.each($scope.vis.params.clickOptions, function (clickOption, ind) {
            if (!clickOption.uriFormat && clickOption.type === 'link') {
              clickOption.uriFormat = '@URL@';
            }
          });
        };

        /**
         * Checks if any column has two or more of the same click action
         */
        var _checkForDuplicates = function () {
          $scope.clickHandlerValidationStates.length = 0;
          _.each($scope.vis.params.clickOptions, function (clickOption) {
            $scope.clickHandlerValidationStates.push({
              state: 'valid',
              message: ''
            });
          });

          _.chain($scope.vis.params.clickOptions)
          .countBy(function (clickOption, ind) {
            return clickOption.type + '$#%' + clickOption.columnField;
          })
          .each(function (count, key) {
            if (count !== 1) {
              var parts = key.split('$#%');
              var msg = 'You cannot have more than one action of the same type on a same column: ' +
                        'found ' + count + ' ' + parts[0] + ' actions on the column ' + parts[1];
              notify.warning(msg);
              _.each($scope.vis.params.clickOptions, function (clickOption, index) {
                if (clickOption.type === parts[0] && clickOption.columnField === parts[1]) {
                  $scope.clickHandlerValidationStates[index].message = msg;
                  $scope.clickHandlerValidationStates[index].state = '';
                }
              });
            }
          });
        };

        $scope.$watch('vis.params.clickOptions', function () {
          clickHandlersChanged();
          _checkForDuplicates();
        }, true);

      }
    };
  });

});
