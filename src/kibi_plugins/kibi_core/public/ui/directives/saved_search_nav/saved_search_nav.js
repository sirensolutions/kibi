import _ from 'lodash';
import { uiModules } from 'ui/modules';
import './saved_search_nav.less';
import 'ui/kibi/components/ontology_client/ontology_client';

uiModules
.get('kibana')
.directive('savedSearchNav', function ($timeout, ontologyClient, config) {
  return {
    template: require('./saved_search_nav.html'),
    restrict: 'E',
    scope: {
      selected: '=',
      showIf: '='
    },
    link($scope, $element, attrs) {
      $scope.defaultIndex = config.get('defaultIndex');
      $scope.showIf = $scope.showIf ? $scope.showIf : true;

      /**
       * Initialize the menu items.
       * @param (boolean) autoSelect Sets the first item as the selected one.
       */
      const initTreeModel = function (autoSelect) {
        $scope.treeModel = [];

        return ontologyClient.getEntities()
        .then((entities) => {

          const indexPatternItems = [];
          const virtualEntityItems = [];

          _.each(entities, (entity) => {
            if (entity.type === 'INDEX_PATTERN') {
              indexPatternItems.push(entity);
            } else if (entity.type === 'VIRTUAL_ENTITY') {
              virtualEntityItems.push(entity);
            }
          });

          const rootIndexPatternMenuItem = {
            id: 'Index Patterns',
            sub: _.sortBy(indexPatternItems, (e) => { return e.label; })
          };
          $scope.treeModel.push(rootIndexPatternMenuItem);

          const rootEntityIdentifiersMenuITem = {
            id: 'Entity Identifiers',
            sub: _.sortBy(virtualEntityItems, (e) => { return e.label; })
          };
          $scope.treeModel.push(rootEntityIdentifiersMenuITem);
        });
      };

      $scope.treeOptions = {
        // Throttle the function to get the child click. We can remove it if one of the following issues gets done:
        // https://github.com/angular-ui-tree/angular-ui-tree/issues/954
        // https://github.com/angular-ui-tree/angular-ui-tree/issues/948
        beforeDrag: _.throttle(function (sourceNodeScope) {
          if (sourceNodeScope.subItem) {
            $scope.selected = sourceNodeScope.subItem;
          }

          // for now we disable drag and drop for every item
          return false;
        }, 50,  { trailing: false }),
        dragStart: function (event) {
        }
      };

      $scope.toggleItem = function (item) {
        item.collapsed = !item.collapsed;
      };

      initTreeModel();
    }
  };
});
