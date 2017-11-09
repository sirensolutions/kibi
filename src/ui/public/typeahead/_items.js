import itemsTemplate from 'ui/typeahead/partials/typeahead-items.html';
import 'ui/notify/directives';
import { uiModules } from 'ui/modules';
import _ from 'lodash';


const typeahead = uiModules.get('kibana/typeahead');

typeahead.directive('kbnTypeaheadItems', function () {
  return {
    restrict: 'E',
    require: '^kbnTypeahead',
    replace: true,
    template: itemsTemplate,

    link: function ($scope, $el, attr, typeahead) {
      $scope.typeahead = typeahead;
    }
  };
});
