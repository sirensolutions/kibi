import angular from 'angular';
import _ from 'lodash';
import chrome from 'ui/chrome';

export default function KibiSpyDataFactory(Promise, $http) {
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

    getFilterjoinStats(item) {
      const yes = {
        markup: '<i class="fa fa-check" aria-hidden="true"></i>'
      };
      const no = {
        markup: '<i class="fa fa-times" aria-hidden="true"></i>'
      };

      return {
        headers: [
          {
            title: 'Source Index',
            sortable: false
          },
          {
            title: 'Source Type',
            sortable: false
          },
          {
            title: 'Source Field',
            sortable: false
          },
          {
            title: 'Target Index',
            sortable: false
          },
          {
            title: 'Target Type',
            sortable: false
          },
          {
            title: 'Target Field',
            sortable: false
          },
          {
            title: 'Number of Terms',
            sortable: false,
            info: 'The size of the filter used to compute the join, i.e., the number of terms across all shards used by the filterjoin.'
          },
          {
            title: 'Bytes',
            sortable: false,
            info: 'The size in bytes of the filter used to compute the join.'
          },
          {
            title: 'Pruned',
            sortable: false,
            info: 'This indicates if the join computation has been pruned based on the maxTermsPerShard limit.'
          },
          {
            title: 'Cached',
            sortable: false,
            info: 'This indicates if the join was already computed and cached.'
          },
          {
            title: 'Terms Encoding',
            sortable: false,
            info: 'The encoding to use when transferring terms across the network.'
          },
          {
            title: 'OrderBy',
            sortable: false,
            info: 'The ordering to use to lookup the maximum number of terms.'
          },
          {
            title: 'MaxTermsPerShard',
            sortable: false,
            info: 'The maximum number of terms per shard to lookup.'
          },
          {
            title: 'Duration',
            sortable: false
          }
        ],
        rows: (function () {
          const rootIndex = item.index;
          const rootType = item.type || '*';

          const actions = item.response.coordinate_search.actions;
          const rows = [];
          for (let i = actions.length - 1; i >= 0; i--) {
            const action = actions[i];

            const row = [
              rootIndex,
              rootType,
              action.relations.to.field,
              JSON.stringify(action.relations.from.indices, null, ' '),
              action.relations.from.types.length ? JSON.stringify(action.relations.from.types, null, ' ') : '*',
              action.relations.from.field,
              action.size,
              action.size_in_bytes,
              action.is_pruned ? yes : no,
              action.cache_hit ? yes : no,
              action.terms_encoding,
              action.order_by || 'default',
              action.max_terms_per_shard || '-1',
              action.took + 'ms'
            ];

            if (action.relations.to.indices) {
              row[0] = JSON.stringify(action.relations.to.indices, null, ' ');
              row[1] = action.relations.to.types.length ? JSON.stringify(action.relations.to.types, null, ' ') : '*';
            }

            rows.push(row);
          }
          return rows;
        }())
      };
    }

    hasFilterjoinStats(item) {
      return item.response.coordinate_search && item.response.coordinate_search.actions.length;
    }

    translateQueries() {
      const promises = _.map(this.data, (item) => {
        return $http.post(chrome.getBasePath() + '/translateToES', { query: angular.toJson(item.query) });
      });
      return Promise.all(promises)
        .then((translateQueries) => {
          _.each(translateQueries, (q, i) => {
            this.data[i].translatedQuery = q.data.translatedQuery;
          });
        });
    };
  }

  return KibiSpyData;
};
