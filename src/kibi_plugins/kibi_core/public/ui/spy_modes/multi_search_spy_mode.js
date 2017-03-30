import _ from 'lodash';
import spyModesRegistry from 'ui/registry/spy_modes';
import template from 'plugins/kibi_core/ui/spy_modes/multi_search_spy_mode.html';
import 'plugins/kibi_core/ui/spy_modes/multi_search_spy_mode.less';

function VisSpyMulti() {
  return {
    name: 'multiSearch',
    display: 'Multi Search',
    order: 5,
    allowSpyMode(visType) {
      return visType.requiresMultiSearch;
    },
    template,
    link($scope) {
      $scope.multiSearchData.getDebugData();
      $scope.$watchCollection(() => $scope.multiSearchData.getData(), () => {
        if ($scope.multiSearchData) {
          $scope.multiSearchData.getDebugData();
        }
      });
    }
  };
}

spyModesRegistry.register(VisSpyMulti);
