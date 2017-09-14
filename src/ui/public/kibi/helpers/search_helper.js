import angular from 'angular';
import _ from 'lodash';
import { emptySearch } from 'ui/kibi/empty_search';
import { toJson } from 'ui/utils/aggressive_parse';

/**
 * An helper that modifies searches.
 */
export class SearchHelper {

  constructor(kbnIndex) {
    this._defaultIndex = kbnIndex;
  }

  /**
   * Returns an optimized msearch part.
   *
   * If the searchBody targets an empty list of indices,
   * returns an msearch part with a match_none query on the raw index pattern if defined,
   * otherwise a match_none query on the Kibi index.
   *
   * @param {Array} indices - The list of indices of the msearch part.
   * @param {Object} searchBody - The search body of the msearch part.
   * @param {String} indexPattern - The index pattern from which the indices were generated.
   * @return {String} the msearch part lines.
   */
  optimize(indices, searchBody, indexPattern) {
    let computedIndices = indices;
    let body = searchBody || {};
    if (_.isArray(indices) && indices.length === 0) {
      if (indexPattern) {
        computedIndices = [indexPattern];
      } else {
        computedIndices = [this._defaultIndex];
      }
      body = emptySearch();
    }
    return `{"index":${angular.toJson(computedIndices)},"ignore_unavailable": true}\n${toJson(body, angular.toJson)}\n`;
  }

}
