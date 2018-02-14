import { uiModules } from 'ui/modules';

import _ from 'lodash';


/*
 * Simple tri-state checkbox using the native 'indeterminate' property
 * of HTML5 checkboxes.
 *
 * Supported ngModel values are:
 *
 *  - 0 = not selected
 *  - 1 = selected
 *  - 2 = indeterminate.
 *
 * Note that the ngModel supports getter/setter properties, to be used
 * for computed model values (like all/none list selections).
 */

uiModules
.get('kibana')
.directive('tristateCheckbox', function () {
  return {
    restrict: 'E',
    require: ['ngModel'],
    scope: {
      model: '=ngModel'
    },

    template: '<input type="checkbox" ng-model="boolValue" />',

    link($scope, element) {
      const checkbox = element.find('input')[0];

      Object.defineProperty($scope, 'boolValue', {
        get() {
          checkbox.indeterminate = (this.model === 2);
          return (this.model === 1);
        },

        set(value) {
          this.model = value;
        }
      });
    }
  };
});

export function allSelected(entries) {
  function selNum(entry) { return +entry.selected; }

  return {
    get allSelected() {
      const selCount = _.sum(entries, selNum);
      return selCount && (1 + (selCount !== entries.length));
    },

    set allSelected(value) {
      entries.forEach(entry => { entry.selected = value; });
    }
  };
};
