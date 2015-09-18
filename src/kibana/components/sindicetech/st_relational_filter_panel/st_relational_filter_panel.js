define(function (require) {

  require('css!components/sindicetech/st_relational_filter_panel/styles/st_relational_filter_panel.css');

  require('jquery');
  require('eeg');
  require('eeg-angular');

  var _ = require('lodash');
  var $ = require('jquery');

  var app = require('modules').get('kibana');

  app.directive(
    'stRelationalFilterPanel',
    function ($location, config, configFile, $rootScope, Private, savedDashboards, savedSearches, Notifier) {

      var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
      var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
      var notify = new Notifier({
        location: 'Relational Filter Panel'
      });

      return {
        restrict: 'E',
        template: require('text!components/sindicetech/st_relational_filter_panel/st_relational_filter_panel.html'),
        link: function ($scope, $el) {



          $scope.relationalPanelConfig = {
            enabled: false
          };

          var  _saveRelationalPanelConfig = function () {
            //return a promise so we can do action when it is resolved
            return config.set('kibi:relationalPanelConfig', $scope.relationalPanelConfig);
          };


          var init = false;
          var _initPanel = function () {
            var g = {
              options: {
                title: 'Check required relations',
                monitorContainerSize: true,
                alwaysShowLinksLabels: true,
                stopAfter: 2000,
                groupingForce: {},
                nodeIcons: {},
                minNodeSize: 30
              },
              nodes: [],
              links: []
            };


            if ($scope.relationalPanelConfig.graph && $scope.relationalPanelConfig.graph.groupingForce) {
              g.options.groupingForce = $scope.relationalPanelConfig.graph.groupingForce;
            }
            if ($scope.relationalPanelConfig.graph && $scope.relationalPanelConfig.graph.nodeIcons) {
              g.options.nodeIcons = $scope.relationalPanelConfig.graph.nodeIcons;
            }


            var extractIndexId = function (s) {
              var index = s.indexOf('.');
              return s.substring(0, index);
            };

            var extractPath = function (s) {
              var index = s.indexOf('.');
              return s.substring(index + 1);
            };

            _.each($scope.relationalPanelConfig.indexes, function (index) {
              g.nodes.push({id: index.id, label: index.id, nodeType: index.id, size: g.options.minNodeSize});
            });

            _.each($scope.relationalPanelConfig.relations, function (relation) {

              var fromId = extractIndexId(relation[0]);
              var toId = extractIndexId(relation[1]);
              var fromPath = extractPath(relation[0]);
              var toPath = extractPath(relation[1]);

              var checked = getRelationIndex($scope.relationalPanelConfig.enabledRelations, relation) === -1 ? '' : 'checked="checked"';

              g.links.push({
                source: fromId,
                target: toId,
                linkType: 'link',
                htmlElement: $('<div>').html(
                  '<div style="width:69px;">' +
                    '<input type="checkbox" ' + checked + '/>' +
                    '&nbsp;<label> Enable</label>' +
                  '</div>').get(0),
                htmlElementWidth: 70,
                htmlElementHeight: 18,
                onLinkClick: function (THIS, d, i) {
                  if ($(THIS).find('input[type=\'checkbox\']').is(':checked')) {
                    // make sure it is inside $scope.relationalFilter
                    addToRelations(relation);
                  } else {
                    // make sure it is removed from $scope.relationalFilter
                    removeFromRelations(relation);
                  }
                }
              });

            });

            $scope.graph = g;
            init = true;
          };

          var _checkFilterJoinPlugin = function () {
            var enabled = joinFilterHelper.isFilterJoinPluginEnabled();
            var installed = joinFilterHelper.isFilterJoinPluginInstalled();
            if (enabled && !installed) {
              notify.error(
                'The FilterJoin plugin is enabled but not installed. ' +
                'Please install the plugin and restart Kibi or ' +
                'disable the relationalPanel in Settings -> Advanced -> kibi:relationalPanelConfig');
            }
          };

          $rootScope.$on('init:config', function () {
            $scope.relationalPanelConfig = config.get('kibi:relationalPanelConfig');
            _checkFilterJoinPlugin();
            _initPanel();
          });

          var getRelationIndex = function (relationsArray, relation) {
            var index = -1;
            _.each(relationsArray, function (r, i) {
              if (r[0] === relation[0] && r[1] === relation[1]) {
                index = i;
                return false;
              }
            });
            return index;
          };

          var addToRelations = function (relation) {
            if (getRelationIndex($scope.relationalPanelConfig.enabledRelations, relation) === -1) {
              $scope.relationalPanelConfig.enabledRelations.push(relation);
              // there is no need to redraw the panel
              // so set ignoreNextConfigurationChangedEvent to true
              $scope.ignoreNextConfigurationChangedEvent = true;
              _saveRelationalPanelConfig();
            }
          };

          var removeFromRelations = function (relation) {
            var index = getRelationIndex($scope.relationalPanelConfig.enabledRelations, relation);
            if (index !== -1) {
              $scope.relationalPanelConfig.enabledRelations.splice(index, 1);
              // there is no need to redraw the panel
              // so set ignoreNextConfigurationChangedEvent to true
              $scope.ignoreNextConfigurationChangedEvent = true;
              _saveRelationalPanelConfig();
            }
          };


          // recreate it after user change configuration
          $rootScope.$on('change:config.kibi:relationalPanelConfig', function () {
            $scope.relationalPanelConfig = config.get('kibi:relationalPanelConfig');
            _checkFilterJoinPlugin();
            if ($scope.ignoreNextConfigurationChangedEvent === true) {
              $scope.ignoreNextConfigurationChangedEvent = false;
            } else {
              _initPanel();
            }
          });

          $scope.show = false;
          $rootScope.$on('relationalFilterPanelOpened', function (event, relationalFilterPanelOpened) {
            $scope.show = relationalFilterPanelOpened;
          });

          $scope.close = function () {
            $scope.show = false;
            $rootScope.$emit('relationalFilterPanelClosed', false);
          };


          $rootScope.$on('$routeChangeSuccess', function (event, next, prev, err) {
            $scope.show = false;
            if (urlHelper.isItDashboardUrl()) {
              // try to enable filter when user switch to dashboards app
              $scope.applyFilter();
            }
          });


          $scope.disableFilter = function () {
            $scope.relationalPanelConfig.enabled = false;
            _saveRelationalPanelConfig().then(function () {
              // here just remove the joinFilter if present
              urlHelper.removeJoinFilter();
            });
          };

          $scope.enableFilter = function () {
            $scope.relationalPanelConfig.enabled = true;
            _saveRelationalPanelConfig().then(function () {
              joinFilterHelper.updateJoinFilter();
            });
          };

          $scope.applyFilter = function () {
            if (init && $scope.relationalPanelConfig.enabled) {
              joinFilterHelper.updateJoinFilter();
            }
          };

        } // end of link function
      };
    });

});
