import _ from 'lodash';
import angular from 'angular';
import { uiModules } from 'ui/modules';
import EntityRelationsTemplate from './entity_relations.html';
import 'plugins/investigate_core/ui/directives/entity_select/entity_select';
import 'plugins/investigate_core/management/sections/kibi_relations/advanced_options/advanced_options';

uiModules.get('apps/management')
.directive('entityRelations', function (createNotifier, ontologyClient, kbnUrl) {
  const notify = createNotifier();

  return {
    restrict: 'E',
    template: EntityRelationsTemplate,
    scope: false,
    link: function ($scope) {
      $scope.relations = [];
      const relationLabelPairMap = [];

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
        $scope.relationLabels = uniqueRelationLabels;
      });

      ontologyClient.getUniqueRelationLabelPairs()
      .then((uniqueRelationLabelPairs) => {
        _.each(uniqueRelationLabelPairs, function (pair) {
          relationLabelPairMap[pair.directLabel] = pair.inverseLabel;
        });
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
              // break the _.each loop
              return false;
            }
          });
          return check;
        };

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

      // this method automatically assigns inverseLabel when the user sets the directLabel or vice versa
      $scope.setOppositeLabel = function (relation, labelType) {
        if (labelType === 'inverse' && relationLabelPairMap[relation.directLabel]) {
          relation.inverseLabel = relationLabelPairMap[relation.directLabel];
        } else if (labelType === 'direct' && relationLabelPairMap[relation.inverseLabel]) {
          relation.directLabel = relationLabelPairMap[relation.inverseLabel];
        }
      };

      // this method automatically refresh suggestion list during user input
      $scope.refreshSuggestions = function ($select) {
        const search = $select.search;
        let list = angular.copy($select.items);

        //remove last user input
        list = list.filter(function (item) {
          if ($scope.relationLabels.indexOf(item) !== -1 || search === item) {
            return true;
          } else {
            return false;
          }
        });

        if (!search) {
          //use the predefined list
          $select.items = list;
        }
        else {
          //manually add user input and set selection
          if($scope.relationLabels.indexOf(search) === -1) {
            list.concat(search);
          };
          $select.items = list;
          $select.selected = search;
        }
      };

      // advanced options
      $scope.edit = function (relId) {
        kbnUrl.change('/management/siren/relations/{{ entity }}/{{ id }}', {
          entity: encodeURIComponent($scope.entity.id),
          id: encodeURIComponent(relId)
        });
      };

      $scope.getAdvancedOptionsInfo = function (relation) {
        let info = 'Join Type: ';
        switch (relation.joinType) {
          case 'MERGE_JOIN':
            info += 'Distributed join using merge join algorithm';
            break;
          case 'HASH_JOIN':
            info += 'Distributed join using hash join algorithm';
            break;
          case 'BROADCAST_JOIN':
            info += 'Broadcast join';
            break;
          default:
            info += 'not set';
        }
        info += '\n';

        info += 'Task timeout: ';
        if (relation.timeout === 0) {
          info += 'not set';
        } else {
          info += relation.timeout;
        }
        return info;
      };
    }
  };
});
