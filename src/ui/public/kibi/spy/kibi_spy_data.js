import angular from 'angular';
import _ from 'lodash';
import chrome from 'ui/chrome';
import { toJson } from 'ui/utils/aggressive_parse';

export function KibiSpyDataFactory(Promise, $http) {
  class KibiSpyData {
    constructor() {
      this.data = [];
    }

    /**
      * Removes any previous added data
      *
      * @returns {undefined}
      */
    clear() {
      this.data.length = 0;
    }

    getDuration() {
      return this.duration;
    }

    setDuration(duration) {
      this.duration = duration;
    }

    /**
    * Adds some stat about a request of a msearch
      *
      * @param index the index name
      * @param duration the time spent by the request
      * @param query the request
      * @param response the response to the query
      * @param pruned true if the filterjoin query got pruned
      */
    add({ index, type, query, meta, response, pruned }) {
      this.data.push({ index, type, query, response, meta, pruned });
    }

    /**
    * GetData returns the stats about a msearch
      */
    getData() {
      return this.data;
    }

    getDebugData() {
      const translations = _.map(this.data, (item) => {
        return $http.post(chrome.getBasePath() + '/translateToES', { bulkQuery: toJson(item.query, angular.toJson) });
      });
      const debugActions = _.map(this.data, (item) => {
        const debugQuery = item.query;
        debugQuery.size = 0;

        let request;
        if (item.type) {
          request = `${chrome.getBasePath()}/elasticsearch/${item.index}/${item.type}/_search?debug=true`;
        } else {
          request = `${chrome.getBasePath()}/elasticsearch/${item.index}/_search?debug=true`;
        }
        return $http.post(request, toJson(debugQuery, angular.toJson));
      });
      return Promise.all([ ...translations, ...debugActions ])
      .then(results => {
        _.each(results, (result, i) => {
          if (i >= this.data.length) {
            this.data[i - this.data.length].actions = result.data;
          } else {
            this.data[i].translatedQuery = result.data.translatedQuery;
          }
        });
      });
    };
  }

  return KibiSpyData;
};
