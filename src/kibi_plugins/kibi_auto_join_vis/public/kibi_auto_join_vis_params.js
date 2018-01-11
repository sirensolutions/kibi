import _ from 'lodash';

import template from 'plugins/kibi_auto_join_vis/kibi_auto_join_vis_params.html';
import { uiModules } from 'ui/modules';
import 'ui/kibi/components/ontology_client/ontology_client';

uiModules
.get('kibana/kibi_auto_join_vis')
.directive('kibiAutoJoinVisParams', function (createNotifier, ontologyClient, savedDashboards, savedSearches, indexPatterns) {
  return {
    restrict: 'E',
    template,
    link: function ($scope) {
      $scope.buttons = [];

      const notify = createNotifier({
        location: 'Kibi Automatic Relational filter params'
      });

      // Updates the buttons to show according to the selected indexpattern.
      $scope.updateFilteredButtons = function () {
        $scope.filteredButtons = _.filter($scope.buttons, (button) => {
          return button.domainIndexPattern === $scope.filterIndexPattern.id || !button.domainIndexPattern;
        });
      };

      /**
       * This functions show the available target dashboards for a given EID relation
       */
      $scope.toggleTargetDashboards = function (button) {
        if (!button.compatibleDashboard) {
          return Promise.all([
            ontologyClient.getRelations(),
            ontologyClient.getDashboardsByEntity(entity),
            ontologyClient.getRelationsByDomain(entity.id)
          ])
          .then(([relations, dashboards, targetRelations]) => {
            const relation = _.find(relations, (rel) => {
              return rel.id === button.indexRelationId;
            });
            let entity = relation.domain;
            if (relation.range.type === 'VIRTUAL_ENTITY') {
              entity = relation.range;
            }
            const compatibleDashboards = _.map(dashboards, (dashboard) => {
              return dashboard.title;
            });
            _.each(targetRelations, (targetRel) => {
              button.compatibleDashboard = {};
              button.compatibleDashboard[targetRel.directLabel] = compatibleDashboards;
            });
            button.showTargetDashboards = !button.showTargetDashboards;
          });
        } else {
          button.showTargetDashboards = !button.showTargetDashboards;
        }
      };

      $scope.resetVisibility = function () {
        $scope.vis.params.visibility = {};
      };

      $scope.getButtonVisibilityClass = function (button) {
        const visibility = $scope.vis.params.visibility;
        if (visibility[button.id] === undefined || visibility[button.id].button === undefined) {
          button.tooltip = 'Default visibility: visible';
          return 'fa fa-eye button-default';
        } else if (visibility[button.id].button) {
          button.tooltip = 'Visible';
          return 'fa fa-eye button-set';
        } else {
          button.tooltip = 'Not visible';
          return 'fa fa-eye-slash button-set';
        }
      };

      $scope.toggleButtonVisibility = function (button) {
        let visibility;
        if ($scope.vis.params.visibility[button.id]) {
          visibility = $scope.vis.params.visibility[button.id];
        } else {
          visibility = {};
        }
        // default state
        if (visibility === {}) {
          visibility.button = true;
        } else if (visibility.button) {
          visibility.button = false;
        } else {
          visibility.button = true;
        }

        $scope.vis.params.visibility[button.id] = visibility;
      };

      return Promise.all([
        ontologyClient.getRelations(),
        indexPatterns.getIds()
      ])
      .then(([relations, indexPatternIds]) => {
        indexPatternIds = _.sortBy(indexPatternIds);

        // populate the indexpatterns dropdown to filter relations (buttons)
        $scope.availableIndexPatterns = _.map(indexPatternIds, (indexPatternId) => {
          return { id: indexPatternId, name: indexPatternId };
        });
        // autoselect the first one
        $scope.filterIndexPattern = $scope.availableIndexPatterns[0];

        // check if we have to add buttons for new relations with EIDs
        const relationsWithNoButton = _.filter(relations, (rel) => {
          return rel.domain.type === 'INDEX_PATTERN';
        });
        _.each(relationsWithNoButton, (rel) => {
          const button = {
            indexRelationId: rel.id,
            domainIndexPattern: rel.domain.id,
            status: 'default'
          };
          if (rel.range.type === 'VIRTUAL_ENTITY') {
            button.type = 'VIRTUAL_ENTITY';
            button.id = rel.id + '-ve-' + rel.range.id;
            button.label = rel.directLabel + ' (' + rel.range.id + ')';
            $scope.buttons.push(button);
          } else if (rel.range.type === 'INDEX_PATTERN') {
            button.type = 'INDEX_PATTERN';

            return Promise.all([savedDashboards.find(),savedSearches.find()])
            .then(([savedDashboards, savedSearches]) => {
              const compatibleSavedSearches = _.filter(savedSearches.hits, (savedSearch) => {
                const searchSource = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON);
                return searchSource.index === rel.range.id;
              });

              _.each(compatibleSavedSearches, (compatibleSavedSearch) => {
                const compatibleDashboards = _.filter(savedDashboards.hits, (savedDashboard) => {
                  return savedDashboard.savedSearchId === compatibleSavedSearch.id;
                });
                _.each(compatibleDashboards, (compatibleDashboard) => {
                  const clonedButton = _.clone(button);
                  clonedButton.label = rel.directLabel + ' (' + compatibleDashboard.title + ')';
                  clonedButton.id = rel.id + '-ip-' + compatibleDashboard.title;
                  $scope.buttons.push(clonedButton);
                });
              });
            });
          }
        });
        $scope.updateFilteredButtons();
      });

    }
  };
});
