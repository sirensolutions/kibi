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

  app.directive('kibiRelationalFilterPanel', function (kibiState, $location, config, $rootScope, Private, createNotifier) {
    var notify = createNotifier({
      location: 'Relational Filter Panel'
    });

    return {
      restrict: 'E',
      template: require('ui/kibi/directives/kibi_relational_filter_panel.html'),
      link: function ($scope, $el) {
        var _initPanel = function () {
          $scope.relations = config.get('kibi:relations');
          var relDashboards = _.cloneDeep($scope.relations.relationsDashboardsSerialized);
          if (!relDashboards) {
            return;
          }
          relDashboards.options.draggable = false;

          _.each(relDashboards.links, function (link) {
            var relation = _.find(
              $scope.relations.relationsDashboards,
              {relation: link.data.id, dashboards: [link.source.replace(/^eegid-/, ''), link.target.replace(/^eegid-/, '')]}
            );
            if (!relation) {
              return;
            }

            link.html = `
              <div>
                <input type="checkbox"
                      ${kibiState.isRelationalPanelEnabled() ? '' : 'disabled'}
                      ${kibiState.isRelationEnabled(relation) ? 'checked' : ''}/>
                &nbsp;<label>${link.linkType}</label>
              </div>`;
          });

          relDashboards.options.onLinkClick = function (el, d, i) {
            // find the relation
            var relation = _.find($scope.relations.relationsDashboards, function (r) {
              return r.relation === d.data.id;
            });
            if (relation) {
              // add or remove the relation id from kibi state
              var enabled = jQuery(el).find('input[type=\'checkbox\']').is(':checked');
              var updateJoinSetOnPromises = [];
              if (enabled) {
                kibiState.enableRelation(relation);
              } else {
                kibiState.disableRelation(relation);
              }
              kibiState.save();
              // there is no need to redraw the panel
              // so set ignoreNextConfigurationChangedEvent to true
              $scope.ignoreNextConfigurationChangedEvent = true;
            }
          };

          $rootScope.$emit('egg:relationalPanel:run', 'importGraph', relDashboards);
        };

        $scope.close = function () {
          $scope.show = false;
          $rootScope.$emit('relationalFilterPanelClosed', false);
        };

        var _checkFilterJoinPlugin = function () {
          var enabled = kibiState.isRelationalPanelButtonEnabled();
          var installed = kibiState.isSirenJoinPluginInstalled();
          if (enabled && !installed) {
            notify.error(
              'The siren-join plugin is enabled but not installed. ' +
                'Please install the plugin and restart Kibi, or ' +
                'disable the relational panel in Settings -> Advanced -> kibi:relationalPanel');
          }
        };

        var off1 = $rootScope.$on('init:config', function () {
          _checkFilterJoinPlugin();
          _initPanel();
        });

        // recreate it after user change configuration
        var off2 = $rootScope.$on('change:config.kibi:relations', function () {
          if ($scope.ignoreNextConfigurationChangedEvent === true) {
            $scope.ignoreNextConfigurationChangedEvent = false;
          } else {
            _checkFilterJoinPlugin();
            _initPanel();
          }
        });

        $scope.show = false;
        var off3 = $rootScope.$on('relationalFilterPanelOpened', function (event, relationalFilterPanelOpened) {
          $scope.show = relationalFilterPanelOpened;
        });

        const updateRelationalPanelOnSave = function (diff) {
          if (diff.indexOf(kibiState._properties.enabled_relations) !== -1 && !kibiState.getEnabledRelations().length) {
            _initPanel();
          } else if (diff.indexOf(kibiState._properties.enabled_relational_panel) !== -1) {
            _initPanel();
          }
        };
        kibiState.on('save_with_changes', updateRelationalPanelOnSave);

        $scope.$on('$destroy', function () {
          off1();
          off2();
          off3();
          kibiState.off('save_with_changes', updateRelationalPanelOnSave);
        });
      } // end of link function
    };
  });

});
