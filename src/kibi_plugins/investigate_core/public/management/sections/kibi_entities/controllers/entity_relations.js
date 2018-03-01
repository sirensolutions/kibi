import { find, sortBy, each, noop, get, isArray } from 'lodash';
import angular from 'angular';
import { uiModules } from 'ui/modules';
import EntityRelationsTemplate from './entity_relations.html';
import 'plugins/investigate_core/ui/directives/entity_select/entity_select';
import '../advanced_options/advanced_options';

uiModules.get('apps/management')
.directive('entityRelations', function ($rootScope, $timeout, createNotifier, ontologyClient, kbnUrl, confirmModalPromise) {
  const notify = createNotifier();

  return {
    restrict: 'E',
    template: EntityRelationsTemplate,
    scope: false,
    link: function ($scope) {
      $scope.relations = [];
      // Cache the first selectedMenuItem from the eid tree (top left -  not the dropdown in the config)
      let cachedSelectedMenuItem = $scope.selectedMenuItem || null;
      const relationLabelPairMap = [];

      // init relations
      ontologyClient.getRelationsByDomain($scope.entity.id)
      .then((relations) => {
        find($scope.editSections, { index: 'entityRelations' }).count = relations.length; // Update the tab count

        // sort relations
        let sortedRelations = relations;
        if (relations && relations.length && relations[0].domain.field) {
          //sort by id, as it is built with index/field
          sortedRelations = sortBy(relations, function (rel) {
            return [rel.domain.id, rel.domain.field, rel.range.id, rel.range.field];
          });
        }
        $scope.relations = sortedRelations;
      });

      ontologyClient.getUniqueRelationLabels()
      .then((uniqueRelationLabels) => {
        $scope.relationLabels = uniqueRelationLabels;
      });

      ontologyClient.getUniqueRelationLabelPairs()
      .then((uniqueRelationLabelPairs) => {
        each(uniqueRelationLabelPairs, function (pair) {
          relationLabelPairMap[pair.directLabel] = pair.inverseLabel;
        });
      });

      ontologyClient.getEntities()
      .then((entities) => {
        $scope.typeMap = {};
        each(entities, (entity) => {
          $scope.typeMap[entity.id] = entity.type;
        });
      });

      $scope.isSaveDisabled = function () {
        if($scope.entityForm) {
          return $scope.entityForm.$pristine;
        }
      };

      // declare the deregister function
      let deregisterLocationChangeStartListener;

      // helper function ro re-register the listener
      function registerListener() {
        deregisterLocationChangeStartListener = $rootScope.$on('$locationChangeStart', confirmIfFormDirty);
      };

      // If the user attempts to close the browser or navigate to e.g. Timelion/Access Control/Sentinl
      window.onbeforeunload = function (e) {
        if($scope.entityForm && $scope.entityForm.$dirty) {
          // This text needs to be set and returned from the function
          // but is never displayed for security reasons.
          // e.g. https://www.chromestatus.com/feature/5349061406228480
          const dialogText = "Not going to be rendered.";
          e.returnValue = dialogText;
          return dialogText;
        }
      };

      let handled = false;

      function confirmIfFormDirty(event, next, current) {
        if (!handled) {
          handled = true;
          // Check if staying on the same page but different entity within the page
          const regEx = /\/management\/siren\/indexesandrelations\/([^\?\&\/]*)/;
          const tabCheck = current.match(regEx);
          const targetCheck = next.match(regEx);
          let tabName = '';
          if (tabCheck && tabCheck.length > 1) {
            tabName = tabCheck[1];
          } else {
            handled = false;
            return;
          }
          // If attempting to change entity
          if (targetCheck === null || targetCheck.length < 2 || targetCheck[1] !== tabName) {
            // If the user has changed the form
            if($scope.entityForm && $scope.entityForm.$dirty) {
              // prevent a digest cycle error by pushing the routeChangeHandling
              // and the deregister of the $locationChangeStart listener to the next digest cycle
              $timeout(() => {
                deregisterLocationChangeStartListener();
                const handleRouteChange = function () {
                  handled = false;
                  // Allow the navigation to take place
                  window.location.href = next;
                };

                const unsavedChangesModal = confirmModalPromise(
                'You have unsaved changes in the relational configuration. Are you sure you want to leave and lose the changes?',
                  {
                    confirmButtonText: 'confirm',
                    cancelButtonText: 'cancel'
                  }
                )
                .then(handleRouteChange)
                .catch(error => {
                  if(error !== undefined) {
                    throw error;
                  }
                  // Navigation has been cancelled by the user in the modal
                  // If there is no cachedSelectedMenuItem, cache it.
                  if(!cachedSelectedMenuItem) {
                    cachedSelectedMenuItem = Object.assign({}, $scope.selectedMenuItem, { id: tabName });
                  } else {
                    // If the user selected a new EID on the eid tree on the left but cancelled the navigation
                    // the selectedMenuItem should be set back to the cached menu item
                    if($scope.selectedMenuItem && cachedSelectedMenuItem.id !== $scope.selectedMenuItem.id) {
                      $scope.updateSelectedMenuItem(cachedSelectedMenuItem);
                    }
                  }
                  $timeout(() => {
                    handled = false;
                    // The user cancelled the navigation, so stay on the same page explicitly
                    window.location.href = current;
                    // We have deregistered the $locationChangeStart listener by now, so register a new one
                    registerListener();
                  }, 0);
                });
              }, 0);
              // This is actually the initial prevention of navigation to allow the comfirm modal appear.
              // event.preventDefault *should* work with a change to e.g. Dashboard/Discover but doesn't
              // so we need to set the window.location.href as well
              event.preventDefault();
              window.location.href = current;
            } else {
              handled = false;
            }
          } else {
            handled = false;
          }
        } else {
          // If there is already a function handling the routeChange, just stay on the same page and wait
          event.preventDefault();
          window.location.href = current;
        }
      }

      registerListener();

      $scope.$on('$destroy', deregisterLocationChangeStartListener);

      $scope.saveRelations = function () {
        /**
        *  Checks if the relations have all the required fields.
        */
        function areValidRelations(menuItem, relations) {
          let check = true;

          each(relations, (rel) => {
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
          $scope.entityForm.$setPristine();
          return check;
        };

        const id = $scope.selectedMenuItem.id;

        if (areValidRelations($scope.selectedMenuItem, $scope.relations)) {
          return ontologyClient.deleteByDomainOrRange(id).then(() => {
            return ontologyClient.insertRelations($scope.relations).then(() => {
              notify.info('Relations saved.');
              find($scope.editSections, { index: 'entityRelations' }).count = $scope.relations.length; // Update the tab count
            });
          });
        } else {
          notify.warning('Some of the relations are not complete, please check them again.');
          return Promise.resolve();
        }
      };

      $scope.setDirty = function () {
        $scope.entityForm.$setDirty();
      };

      // this method automatically assigns inverseLabel when the user sets the directLabel if it is not set already or vice versa
      $scope.setOppositeLabel = function (relation, labelType) {
        if (labelType === 'inverse' && !relation.inverseLabel && relationLabelPairMap[relation.directLabel]) {
          relation.inverseLabel = relationLabelPairMap[relation.directLabel];
        } else if (labelType === 'direct' && !relation.directLabel && relationLabelPairMap[relation.inverseLabel]) {
          relation.directLabel = relationLabelPairMap[relation.inverseLabel];
        }
      };

      $scope.bindOnBlur = ($select, labelType) => {
        const setLabelIfMissing = function (relation, labelType) {
          if ($scope.relationLabels.indexOf(relation) === -1) {
            $scope.relationLabels.push(relation);
            $scope.setOppositeLabel(relation, 'inverse');
          }
        };

        $select.searchInput.on('blur', () => {
          setLabelIfMissing($select.search, labelType);
        });
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
        } else {
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
})
.directive('kibiRelationsSearchBar', () => {
  return {
    restrict: 'A',
    scope: true,
    link: function (scope, element, attrs) {

      scope.searchRelations = function () {
        const relations = get(scope, attrs.kibiRelationsSearchBarPath);
        const searchString = scope[attrs.ngModel];

        if (!searchString || searchString.length < 2) {
          relations.forEach((relation) => relation.$$hidden = false);
          return;
        }

        const search = function (obj, searchString) {
          let result;
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              if (typeof obj[key] === 'object' && obj[key] !== null || isArray(obj[key]) && obj[key].length) {
                result = search(obj[key], searchString);
                if (result) {
                  return result;
                }
              }
              if (typeof obj[key] === 'string') {
                const found = obj[key].match(new RegExp(searchString, 'gi'));
                if (found && found.length) {
                  return true;
                }
              }
            }
          }
          return result;
        };

        relations.forEach((relation) => {
          if (search(relation, searchString)) {
            relation.$$hidden = false;
          } else {
            relation.$$hidden = true;
          }
        });
      };
    }
  };
});
