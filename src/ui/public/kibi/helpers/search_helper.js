import angular from 'angular';
import _ from 'lodash';
import emptySearch from 'ui/kibi/empty_search';
import { toJson } from 'ui/utils/aggressive_parse';

/**
 * An helper that modifies searches.
 */
export default class SearchHelper {

  constructor(kbnIndex) {
    this._defaultIndex = kbnIndex;
  }

  /**
   * Returns an optimized msearch part.
   *
   * If the searchBody targets an empty list of indices,
   * returns an msearch part without matches against the .kibi index.
   *
   * @param {Array} indices - The list of indices of the msearch part.
   * @param {Object} searchBody - The search body of the msearch part.
   * @return {String} the msearch part lines.
   */
  optimize(indices, searchBody) {
    let computedIndices = indices;
    let body = searchBody || {};
    let typeParameter = '';
    if (_.isArray(indices) && indices.length === 0) {
      computedIndices = [this._defaultIndex];
      typeParameter = ' "type": "null",';
      body = emptySearch();
    }
    return `{"index":${angular.toJson(computedIndices)},${typeParameter} "ignore_unavailable": true}\n${toJson(body, angular.toJson)}\n`;
  }

}
