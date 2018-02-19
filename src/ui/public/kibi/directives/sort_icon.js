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

  function setStatus(list, status) {
    _.forEach(result, srt => srt.status = 2);
    this.status = status;

    return (status === 2)
      ? list
      : _.sortByOrder(list, this.sorter, this.order);
  }

  function setOrder(list, order) {
    const status = sortOrder.indexOf(order);
    return (status < 0) ? list : this.setStatus(list, status);
  }

  function toggle(list) {
    return this.setStatus(list, +!this.status);
  }

  function setUnordered() {
    this.status = 2;
  }

  return result = _.mapValues(sorters, sorter => ({
    sorter: _.iteratee(sorter),
    status: 2,
    get order() { return sortOrder[this.status]; },
    get iconClass() { return iconClass[this.status]; },
    setStatus,
    setOrder,
    toggle,
    setUnordered
  }));
};
