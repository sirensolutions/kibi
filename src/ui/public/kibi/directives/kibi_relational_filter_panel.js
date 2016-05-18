define(function (require) {

  require('ui/kibi/directives/kibi_relational_filter_panel.less');
  require('ui/kibi/directives/eeg');

  require('angular-animate');
  require('eeg');

  var jQuery = require('jquery');
  var _ = require('lodash');

  var app = require('ui/modules').get('kibana', ['ngAnimate']);

  app.animation('.animate-kibi-relational-filter-panel', function () {
    return {
      beforeAddClass: function (element, className, doneFn) {
        // close
        jQuery(element).slideUp(250, doneFn);
      },

      removeClass: function (element, className, doneFn) {
        // open
        element.css('display', 'none');
        jQuery(element).slideDown(250, doneFn);
      }
    };
  });

  app.directive(
    'kibiRelationalFilterPanel',
    function ($location, config, $rootScope, Private, createNotifier) {

      var joinFilterHelper = Private(require('ui/kibi/helpers/join_filter_helper/join_filter_helper'));
      var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
      var urlHelper        = Private(require('ui/kibi/helpers/url_helper'));
      var notify = createNotifier({
        location: 'Relational Filter Panel'
      });

      return {
        restrict: 'E',
        template: require('ui/kibi/directives/kibi_relational_filter_panel.html'),
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
            if (!relDashboards) {
              return;
            }
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
                '<input type="checkbox" ' + (kibiStateHelper.isRelationEnabled(relation) ? 'checked' : '') + '/>' +
                '&nbsp;<label>' + link.linkType + '</label>' +
                '</div>';
            });


            relDashboards.options.onLinkClick = function (el, d, i) {
              _.each($scope.relationalPanel.relations.relationsDashboards, function (relation) {
                // find the relation
                if (relation.dashboards.indexOf(d.source.label) !== -1 &&
                    relation.dashboards.indexOf(d.target.label) !== -1) {

                  // add or remove the relation id from kibi state
                  var enabled = jQuery(el).find('input[type=\'checkbox\']').is(':checked');
                  if (enabled) {
                    kibiStateHelper.enableRelation(relation);
                  } else {
                    kibiStateHelper.disableRelation(relation);
                  }
                  if ($scope.relationalPanel.enabled) {
                    // Note: here we have to update the JoinSetFilter for all dashboards from
                    // all enabled relations and not only for these from clicked relation
                    // This is needed as relational buttons takes filters from kibi state
                    // and if the filter is missing the counts on buttons will be wrong

                    // TODO: join_set should be stored as 1 another property in kibi state
                    // and not per dashboard as join_set will be always one for all dashboards
                    // issue: https://github.com/sirensolutions/kibi-internal/issues/1011
                    var promises = [];
                    _.each(kibiStateHelper.getEnabledRelations(), function (relDashboards) {
                      promises.push(joinFilterHelper.updateJoinSetFilter(relDashboards));
                    });
                    Promise.all(promises).then(function () {
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
            var installed = joinFilterHelper.isSirenJoinPluginInstalled();
            if (enabled && !installed) {
              notify.error(
                'The siren-join plugin is enabled but not installed. ' +
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
