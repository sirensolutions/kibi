import _ from 'lodash';
import angular from 'angular';
// kibi: imports
import emptySearch from 'ui/kibi/empty_search';
// kibi: end

import { toJson } from 'ui/utils/aggressive_parse';

export function SearchStrategyProvider(Private, Promise, timefilter, kbnIndex, sessionId) {

  return {
    clientMethod: 'msearch',

    /**
     * Flatten a series of requests into as ES request body
     *
     * @param  {array} reqsFetchParams - the requests to serialize
     * @return {Promise} - a promise that is fulfilled by the request body
     */
    reqsFetchParamsToBody: function (reqsFetchParams) {
      const indexToListMapping = {};
      const timeBounds = timefilter.getActiveBounds();

      return Promise.map(reqsFetchParams, function (fetchParams) {
        return Promise.resolve(fetchParams.index)
        .then(function (indexList) {
          if (!_.isFunction(_.get(indexList, 'toIndexList'))) {
            return indexList;
          }

          if (!indexToListMapping[indexList.id]) {
            indexToListMapping[indexList.id] = timeBounds
              ? indexList.toIndexList(timeBounds.min, timeBounds.max)
              : indexList.toIndexList();
          }
          return indexToListMapping[indexList.id].then(indexList => {
            // Make sure the index list in the cache can't be subsequently updated.
            return _.clone(indexList);
          });
        })
        .then(function (indexList) {
          let body = fetchParams.body || {};
          let index = [];
          // kibi: if there are no indices, issue a match_none query
          // against the raw index pattern.
          if (_.isArray(indexList) && indexList.length === 0) {
            if (fetchParams.index.id) {
              index.push(fetchParams.index.id);
            } else {
              index = fetchParams.index;
            }
            if (_.isArray(index) && index.length === 0) {
              index = [kbnIndex];
            }
            body = emptySearch();
          } else {
            index = indexList;
          }
          // kibi: end
          return angular.toJson({
            index,
            type: fetchParams.type,
            search_type: fetchParams.search_type,
            ignore_unavailable: true,
            preference: sessionId,
          })
          + '\n'
          + toJson(body, angular.toJson);
        });
      })
      .then(function (requests) {
        return requests.join('\n') + '\n';
      });
    },

    /**
     * Fetch the multiple responses from the ES Response
     * @param  {object} resp - The response sent from Elasticsearch
     * @return {array} - the list of responses
     */
    getResponses: function (resp) {
      return resp.responses;
    }
  };
}

