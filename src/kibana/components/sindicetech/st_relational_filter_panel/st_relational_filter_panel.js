define(function (require) {

  require('css!components/sindicetech/st_relational_filter_panel/styles/st_relational_filter_panel.css');

  require('angular-animate');
  require('eeg');

  var _ = require('lodash');
  var $ = require('jquery');

  var app = require('modules').get('kibana', ['ngAnimate']);

  app.animation('.animate-relational-filter-panel', function () {
    return {
      beforeAddClass: function (element, className, doneFn) {
        // close
        $(element).slideUp(250, doneFn);
      },

      removeClass: function (element, className, doneFn) {
        // open
        element.css('display', 'none');
        $(element).slideDown(250, doneFn);
      }
    };
  });

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


          var init = false;
          var _initPanel = function () {
            var relDashboards = _.cloneDeep($scope.relationalPanel.relations.relationsDashboardsSerialized);
            relDashboards.options.draggable = false;

            _.each(relDashboards.links, function (link) {
              var relation = _.find(
                $scope.relationalPanel.relations.relationsDashboards,
                {relation: link.data.id, dashboards: [link.source.replace(/^eegid-/, ''), link.target.replace(/^eegid-/, '')]}
              );
              if (!relation) {
                return;
              }

              link.html = '<div>' +
                '<input type="checkbox" ' + (relation.enabled ? 'checked' : '') + '/>' +
                '&nbsp;<label>' + link.linkType + '</label>' +
                '</div>';
            });



            relDashboards.options.onLinkClick = function (el, d, i) {
              _.each($scope.relationalPanel.relations.relationsDashboards, function (relation) {
                if (relation.dashboards.indexOf(d.source.label) !== -1 &&
                    relation.dashboards.indexOf(d.target.label) !== -1) {
                  relation.enabled = $(el).find('input[type=\'checkbox\']').is(':checked');
                  $scope.ignoreNextConfigurationChangedEvent = true;

                  _saveRelationalPanel().then(function () {
                    if ($scope.relationalPanel.enabled) {
                      joinFilterHelper.updateJoinSetFilter(relation.dashboards).then(function () {
                        $rootScope.$emit('kibi:update-counts:join_set');
                      });
                    }
                  });
                  return false;
                }
              });
            };

            $rootScope.$emit('egg:relationalPanel:run', 'importGraph', relDashboards);
            init = true;
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
              joinFilterHelper.updateJoinSetFilter();
            }
          });

        } // end of link function
      };
    });

});
