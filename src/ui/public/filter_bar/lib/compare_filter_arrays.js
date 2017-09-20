import _ from 'lodash';
import compareFilters from 'ui/filter_bar/lib/compare_filters';

/**
 * Compare two filters to see if they match
 * @param {object} firstArray The first filter array to compare
 * @param {object} secondArray The second filter array to compare
 * @param {object} comparatorOptions Parameters to use for comparison
 * @returns {bool} Filter arrays are the same
 */
export function CompareFilterArraysFn(firstArray, secondArray, comparatorOptions) {
  if (firstArray.length !== secondArray.length) {
    return false;
  } else {
    return _.every(secondArray, function (secondFilter) {
      const match = _.find(firstArray, function (firstFilter) {
        return compareFilters(secondFilter, firstFilter);
      });
      return !!match;
    });
  }

}
