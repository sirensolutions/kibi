import itemsListTemplate from 'ui/typeahead/partials/typeahead-items-list.html';
import { uiModules } from 'ui/modules';

const typeahead = uiModules.get('kibana/typeahead');

/*
 * kibi: Directive specific to a list of items, that can be reused
 *       in multiple typeahead tabs
 */

typeahead.directive('kbnTypeaheadItemsList', function () {
  return {
    restrict: 'E',
    require: '^kbnTypeahead',
    replace: true,
    template: itemsListTemplate,
    scope: { items: "=" },

    link($scope, el, attrs, typeahead) {
      $scope.typeahead = typeahead;
    }
  };
});


