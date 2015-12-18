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


          var _initScope = function () {
            $scope.relationalPanel = {
              enabled: config.get('kibi:relationalPanel'),
              relations: config.get('kibi:relations')
            };
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
                '<input type="checkbox" ' + ( kibiStateHelper.isRelationEnabled(relation.relation) ? 'checked' : '') + '/>' +
                '&nbsp;<label>' + link.linkType + '</label>' +
                '</div>';
            });


            relDashboards.options.onLinkClick = function (el, d, i) {
              _.each($scope.relationalPanel.relations.relationsDashboards, function (relation) {
                if (relation.dashboards.indexOf(d.source.label) !== -1 &&
                    relation.dashboards.indexOf(d.target.label) !== -1) {

                  // add or remove the relation id from kibi state
                  var enabled = $(el).find('input[type=\'checkbox\']').is(':checked');
                  if (enabled) {
                    kibiStateHelper.enableRelation(relation.relation);
                  } else {
                    kibiStateHelper.disableRelation(relation.relation);
                  }
                  if ($scope.relationalPanel.enabled) {
                    joinFilterHelper.updateJoinSetFilter(relation.dashboards).then(function () {
                      $rootScope.$emit('kibi:update-tab-counts');
                    });
                  }
                  return false; // break the loop
                }
              });
            };

            $rootScope.$emit('egg:relationalPanel:run', 'importGraph', relDashboards);
            init = true;
          };

          $scope.close = function () {
            $scope.show = false;
            $rootScope.$emit('relationalFilterPanelClosed', false);
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

          var off1 = $rootScope.$on('init:config', function () {
            _initScope();
            _checkFilterJoinPlugin();
            _initPanel();
          });


          // recreate it after user change configuration
          var off2 = $rootScope.$on('change:config.kibi:relations', function () {
            _initScope();
            _checkFilterJoinPlugin();
            if ($scope.ignoreNextConfigurationChangedEvent === true) {
              $scope.ignoreNextConfigurationChangedEvent = false;
            } else {
              _initPanel();
            }
          });

          $scope.show = false;
          var off3 = $rootScope.$on('relationalFilterPanelOpened', function (event, relationalFilterPanelOpened) {
            $scope.show = relationalFilterPanelOpened;
          });

          var off4 = $rootScope.$on('$routeChangeSuccess', function (event, next, prev, err) {
            $scope.show = false;
            if (urlHelper.isItDashboardUrl() && init && $scope.relationalPanel.enabled) {
              // try to enable filter when user switch to dashboards app
              joinFilterHelper.updateJoinSetFilter();
            }
          });

          var off5 = $rootScope.$on('kibi:update-relational-panel', function () {
            _initScope();
            _initPanel();
          });


          $scope.$on('$destroy', function () {
            off1();
            off2();
            off3();
            off4();
            off5();
          });

        } // end of link function
      };
    });

});
