import { uiModules } from 'ui/modules';

import _ from 'lodash';


/*
 * Arrow icon for sorting a list of values, currently supporting only a single sorter
 * at any given time.
 */

uiModules
.get('kibana')
.directive('sortIcon', function () {
  return {
    restrict: 'AE',
    scope: {
      rows: '=',
      sortBy: '=',
    },

    transclude: true,
    template:
`<span ng-click="onClick()">
  <span ng-transclude />
  <i class="fa" ng-class="sortBy.iconClass" />
</span>`,

    link($scope, element) {
      $scope.onClick = function onClick() {
        $scope.rows = $scope.sortBy.toggle($scope.rows);
      };
    }
  };
});

export function sortContext(sorters) {
  const sortOrder = ['asc', 'desc', ''];
  const iconClass = ['fa-sort-asc', 'fa-sort-desc', 'fa-sort'];

  let result;

  function set(list, status) {
    _.forEach(result, srt => srt.status = 2);
    this.status = status;

    return _.sortByOrder(list, this.sorter, this.order);
  }

  function toggle(list) {
    return this.set(list, +!this.status);
  }

  return result = _.mapValues(sorters, sorter => ({
    sorter: _.iteratee(sorter),
    status: 2,
    get order() { return sortOrder[this.status]; },
    get iconClass() { return iconClass[this.status]; },
    'set': set,
    toggle
  }));
};
