import 'ui/kibi/directives/kibi_relational_filter_panel.less';
import 'ui/kibi/directives/eeg';
import 'angular-animate';
import 'eeg';
import jQuery from 'jquery';
import _ from 'lodash';
import uiModules from 'ui/modules';
import RelationsHelperProvider from 'ui/kibi/helpers/relations_helper';
import template from 'ui/kibi/directives/kibi_relational_filter_panel.html';

uiModules
.get('kibana', ['ngAnimate'])
.config(['$animateProvider', ($animateProvider) => {
  $animateProvider.classNameFilter(/animate-.*/);
}])
.animation('.animate-kibi-relational-filter-panel', function ($rootScope) {
  return {
    beforeAddClass: function (element, className, doneFn) {
      // close by adding ng-hide class
      jQuery(element).slideUp(100, doneFn);
    },

    removeClass: function (element, className, doneFn) {
      // open by removing ng-hide class
      jQuery(element).slideDown(100, () => {
        // call update when animation is finished to redraw the legend
        // as it could have been drawn incorrectly due to the fact the panel is not visible
        // when initial import is done
        $rootScope.$emit('egg:relationalPanel:run', 'update');
        doneFn();
      });
    }
  };
})
.directive('kibiRelationalFilterPanel', function (kibiState, config, $rootScope, Private, createNotifier) {
  const relationsHelper = Private(RelationsHelperProvider);
  const notify = createNotifier({
    location: 'Relational Filter Panel'
  });

  return {
    restrict: 'E',
    template,
    link: function ($scope, $el) {
      const _initPanel = function () {
        _checkIfRelationsAreValid();
        $scope.relations = config.get('kibi:relations');
        const relDashboards = _.cloneDeep($scope.relations.relationsDashboardsSerialized);
        if (!relDashboards) {
          return;
        }
        relDashboards.options.draggable = false;

        _.each(relDashboards.links, function (link) {
          const relation = _.find(
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
          const relation = _.find($scope.relations.relationsDashboards, d.data);
          if (relation) {
            // add or remove the relation id from kibi state
            const enabled = jQuery(el).find('input[type=\'checkbox\']').is(':checked');
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

      const _checkFilterJoinPlugin = function () {
        return kibiState.isSirenJoinPluginInstalled()
        .then(installed => {
          const enabled = kibiState.isRelationalPanelButtonEnabled();
          if (enabled && !installed) {
            notify.error(
              'The siren-platform plugin is enabled but not installed. ' +
              'Please install the plugin and restart Kibi, or disable the relational panel in Management / Relations'
            );
          }
        });
      };

      const initConfigOff = config.watch('init:config', function () {
        _checkFilterJoinPlugin()
        .then(() => _initPanel());
      });

      $scope.show = false;
      const relationalFilterPanelOpenedOff = $rootScope.$on('relationalFilterPanelOpened', function (event, relationalFilterPanelOpened) {
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
      });
    } // end of link function
  };
});
