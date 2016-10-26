define(function (require) {

  require('ui/kibi/directives/kibi_relational_filter_panel.less');
  require('ui/kibi/directives/eeg');

  require('angular-animate');
  require('eeg');

  var jQuery = require('jquery');
  var _ = require('lodash');

  var app = require('ui/modules')
    .get('kibana', ['ngAnimate'])
    .config(['$animateProvider', ($animateProvider) => {
      $animateProvider.classNameFilter(/animate-.*/);
    }]);

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

  app.directive('kibiRelationalFilterPanel', function (kibiState, config, $rootScope, Private, createNotifier) {
    const relationsHelper = Private(require('ui/kibi/helpers/relations_helper'));
    var notify = createNotifier({
      location: 'Relational Filter Panel'
    });

    return {
      restrict: 'E',
      template: require('ui/kibi/directives/kibi_relational_filter_panel.html'),
      link: function ($scope, $el) {
        var _initPanel = function () {
          _checkIfRelationsAreValid();
          $scope.relations = config.get('kibi:relations');
          var relDashboards = _.cloneDeep($scope.relations.relationsDashboardsSerialized);
          if (!relDashboards) {
            return;
          }
          relDashboards.options.draggable = false;

          _.each(relDashboards.links, function (link) {
            var relation = _.find(
              $scope.relations.relationsDashboards,
              {relation: link.data.relation, dashboards: [link.source.replace(/^eegid-/, ''), link.target.replace(/^eegid-/, '')]}
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
            var relation = _.find($scope.relations.relationsDashboards, d.data);
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
            } else {
              notify.warning(`Unable to find relation between dashboards ${d.data.dashboards[0]} and ${d.data.dashboards[0]}`);
            }
          };

          $rootScope.$emit('egg:relationalPanel:run', 'importGraph', relDashboards);
        };

        function _checkIfRelationsAreValid() {
          const { validIndices, validDashboards } = relationsHelper.checkIfRelationsAreValid();
          $scope.validRelations = validIndices && validDashboards;
        };

        _checkIfRelationsAreValid();

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

        var initConfigOff = $rootScope.$on('init:config', function () {
          _checkFilterJoinPlugin();
          _initPanel();
        });

        $scope.show = false;
        var relationalFilterPanelOpenedOff = $rootScope.$on('relationalFilterPanelOpened', function (event, relationalFilterPanelOpened) {
          $scope.show = relationalFilterPanelOpened;
          if (relationalFilterPanelOpened) {
            _initPanel();
          }
        });

        const updateRelationalPanelOnSave = function (diff) {
          if (diff.indexOf(kibiState._properties.enabled_relations) !== -1 && !kibiState.getEnabledRelations().length) {
            _initPanel();
          } else if (diff.indexOf(kibiState._properties.enabled_relational_panel) !== -1) {
            _initPanel();
          }
        };
        $scope.$listen(kibiState, 'save_with_changes', updateRelationalPanelOnSave.bind(this));

        $scope.$on('$destroy', function () {
          initConfigOff();
          relationalFilterPanelOpenedOff();
          relationsHelper.destroy();
        });
      } // end of link function
    };
  });

});
