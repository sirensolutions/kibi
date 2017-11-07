import { uiModules } from 'ui/modules';
import EntityRelationsTemplate from './entity_relations.html';
import 'plugins/kibi_core/ui/directives/entity_select/entity_select';

uiModules.get('apps/management')
.directive('entityRelations', function (createNotifier, ontologyClient) {
  const notify = createNotifier();

  return {
    restrict: 'E',
    template: EntityRelationsTemplate,
    scope: false,
    link: function ($scope) {
      $scope.relations = [];
      let relationLabels;

      // init relations
      ontologyClient.getRelationsByDomain($scope.entity.id)
      .then((relations) => {
        _.find($scope.editSections, { index: 'entityRelations' }).count = relations.length; // Update the tab count

        // sort relations
        let sortedRelations = relations;
        if (relations && relations.length && relations[0].domain.field) {
          //sort by id, as it is built with index/field
          sortedRelations = _.sortBy(relations, 'id');
        }
        $scope.relations = sortedRelations;
      });

      ontologyClient.getUniqueRelationLabels()
      .then((uniqueRelationLabels) => {
        relationLabels = uniqueRelationLabels;
      });

      ontologyClient.getEntities()
      .then((entities) => {
        $scope.typeMap = {};
        _.each(entities, (entity) => {
          $scope.typeMap[entity.id] = entity.type;
        });
      });

      $scope.saveRelations = function () {
        /**
        *  Checks if the relations have all the required fields.
        */
        function areValidRelations(menuItem, relations) {
          let check = true;

          _.each(relations, (rel) => {
            if (menuItem && menuItem.type === 'INDEX_PATTERN') {
              if (!rel || !rel.domain || !rel.range || !rel.domain.field || !rel.range.id) {
                check = false;
              }
            } else if (menuItem && menuItem.type === 'VIRTUAL_ENTITY') {
              if (!rel || !rel.range || !rel.range.field || !rel.range.id) {
                check = false;
              }
            } else {
              check = false;
            }

            if (!check) {
              // breack the _.each loop
              return false;
            }
          });
          return check;
        };

        console.log('SAVE RELATIONS!!!');
        console.log($scope.relations);
        const id = $scope.selectedMenuItem.id;

        if (areValidRelations($scope.selectedMenuItem, $scope.relations)) {
          return ontologyClient.deleteByDomainOrRange(id).then(() => {
            return ontologyClient.insertRelations($scope.relations).then(() => {
              notify.info('Relations saved.');
              _.find($scope.editSections, { index: 'entitiesRelations' }).count = $scope.relations.length; // Update the tab count
            });
          });
        } else {
          notify.warning('Some of the relations are not complete, please check them again.');
          return Promise.resolve();
        }
      };
    }
  };
});
