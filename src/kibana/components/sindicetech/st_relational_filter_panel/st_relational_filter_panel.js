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
      var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
      var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
      var notify = new Notifier({
        location: 'Relational Filter Panel'
      });

      return {
        restrict: 'E',
        template: require('text!components/sindicetech/st_relational_filter_panel/st_relational_filter_panel.html'),
        link: function ($scope, $el) {


          $scope.relationalPanel = {};

          var _saveRelationalPanel = function () {
            //return a promise so we can do action when it is resolved
            return config.set('kibi:relations', $scope.relationalPanel.relations);
          };

          var _getRelationLabel = function (relationId) {
            var label;

            _.each($scope.relationalPanel.relations.relationsIndices, function (relation) {
              if (relationId === relation.id) {
                label = relation.label;
                return false;
              }
            });
            return label;
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
                minNodeSize: 20
              },
              nodes: [],
              links: []
            };

            // each node is a dashboard
            _($scope.relationalPanel.relations.relationsDashboards).map(function (relation) {
              return relation.dashboards;
            }).flatten().uniq().each(function (dashboardId) {
              g.nodes.push({id: dashboardId, label: dashboardId, nodeType: dashboardId, size: g.options.minNodeSize});
            });


            _.each($scope.relationalPanel.relations.relationsDashboards, function (relation, index) {

              g.links.push({
                source: relation.dashboards[0],
                target: relation.dashboards[1],
                linkType: 'link',
                htmlElement: $('<div>').html(
                  '<div style="width:69px;">' +
                    '<input type="checkbox" ' + (relation.enabled ? 'checked' : '') + '/>' +
                    '&nbsp;<label> ' + _getRelationLabel(relation.relation) + '</label>' +
                  '</div>').get(0),
                htmlElementWidth: 70,
                htmlElementHeight: 18,
                onLinkClick: function (THIS, d, i) {
                  if ($(THIS).find('input[type=\'checkbox\']').is(':checked')) {
                    enableRelation(index);
                  } else {
                    disableRelation(index);
                  }
                }
              });

            });

            $scope.graph = g;
            init = true;
          };

          var enableRelation = function (relationIndex) {
            if (init) {
              $scope.relationalPanel.relations.relationsDashboards[relationIndex].enabled = true;
              $scope.ignoreNextConfigurationChangedEvent = true;
              _saveRelationalPanel().then(function () {
                if ($scope.relationalPanel.enabled) {
                  joinFilterHelper.updateJoinFilter();
                }
              });
            }
          };

          var disableRelation = function (relationIndex) {
            if (init) {
              $scope.relationalPanel.relations.relationsDashboards[relationIndex].enabled = false;
              $scope.ignoreNextConfigurationChangedEvent = true;
              _saveRelationalPanel().then(function () {
                if ($scope.relationalPanel.enabled) {
                  joinFilterHelper.updateJoinFilter();
                }
              });
            }
          };

          var _checkFilterJoinPlugin = function () {
            var enabled = joinFilterHelper.isRelationalPanelEnabled();
            var installed = joinFilterHelper.isFilterJoinPluginInstalled();
            if (enabled && !installed) {
              notify.error(
                'The FilterJoin plugin is enabled but not installed. ' +
                'Please install the plugin and restart Kibi, or ' +
                'disable the relational panel in Settings -> Advanced -> kibi:relationalPanel');
            }
          };

          $rootScope.$on('init:config', function () {
            $scope.relationalPanel.enabled = config.get('kibi:relationalPanel');
            $scope.relationalPanel.relations = config.get('kibi:relations');
            _checkFilterJoinPlugin();
            _initPanel();
          });


          // recreate it after user change configuration
          $rootScope.$on('change:config.kibi:relations', function () {
            $scope.relationalPanel.enabled = config.get('kibi:relationalPanel');
            $scope.relationalPanel.relations = config.get('kibi:relations');
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
            if (urlHelper.isItDashboardUrl() && init && $scope.relationalPanel.enabled) {
              // try to enable filter when user switch to dashboards app
              joinFilterHelper.updateJoinFilter();
            }
          });

        } // end of link function
      };
    });

});
