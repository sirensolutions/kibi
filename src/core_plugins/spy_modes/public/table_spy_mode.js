import { saveAs } from '@spalger/filesaver';
import _ from 'lodash';
import 'ui/agg_table';
import AggResponseTabifyTabifyProvider from 'ui/agg_response/tabify/tabify';
import tableSpyModeTemplate from 'plugins/spy_modes/table_spy_mode.html';

const allowSpyMode = function (visType) {
  return !visType.requiresMultiSearch && visType.name !== 'kibi-data-table';
};

function VisSpyTableProvider($rootScope, Private) {
  const tabifyAggResponse = Private(AggResponseTabifyTabifyProvider);

  const PER_PAGE_DEFAULT = 10;


  return {
    name: 'table',
    display: 'Table',
    order: 1,
    // kibi: do not show if the vis is incompatible with this mode
    allowSpyMode,
    template: tableSpyModeTemplate,
    link: function tableLinkFn($scope, $el) {
      $rootScope.$watchMulti.call($scope, [
        'vis',
        'esResp'
      ], function () {
        if (!$scope.vis || !$scope.esResp) {
          $scope.table = null;
        } else {
          // kibi: do not render the table if the mode is not supported by the vis
          if (!allowSpyMode($scope.vis.type)) {
            return;
          }
          // kibi: end
          if (!$scope.spy.params.spyPerPage) {
            $scope.spy.params.spyPerPage = PER_PAGE_DEFAULT;
          }

          $scope.table = tabifyAggResponse($scope.vis, $scope.esResp, {
            canSplit: false,
            asAggConfigResults: true,
            partialRows: true
          });
        }
      });
    }
  };
}

require('ui/registry/spy_modes').register(VisSpyTableProvider);
