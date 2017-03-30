import _ from 'lodash';
import uniqFilters from 'ui/filter_bar/lib/uniq_filters';
import DecorateQueryProvider from 'ui/courier/data_source/_decorate_query';

/**
* Create a filter that can be reversed for filters with negate set
* @param {boolean} reverse This will reverse the filter. If true then
*                          anything where negate is set will come
*                          through otherwise it will filter out
* @returns {function}
*/
const filterNegate = function (reverse) {
  return function (filter) {
    if (_.isUndefined(filter.meta) || _.isUndefined(filter.meta.negate)) return !reverse;
    return filter.meta && filter.meta.negate === reverse;
  };
};

/**
* Translate a filter into a query to support es 3+
* @param  {Object} filter - The filter to translate
* @return {Object} the query version of that filter
*/
const translateToQuery = function (filter) {
  if (!filter) return;

  if (filter.query) {
    return filter.query;
  }

  return filter;
};

/**
* Clean out any invalid attributes from the filters
* @param {object} filter The filter to clean
* @returns {object}
*/
const cleanFilter = function (filter) {
  return _.omit(filter, ['meta']);
};

export default function QueryBuilderFactory(Private, kibiState) {
  const decorateQuery = Private(DecorateQueryProvider);

  /*
  * The parameter savedSearch should be a reference to a SavedSearch
    * instance, not a SavedSearch id
    */
  return function queryBuilder(filters = [], queries, time) {
    const request = {};

    // logic copied from src/ui/public/courier/data_source/_abstract.js
    _.each(filters, function (filter) {
      if (filter.query) {
        decorateQuery(filter.query);
      }
    });

    request.query = {
      bool: {
        must: (
          filters
          .filter(filterNegate(false))
          .map(translateToQuery)
          .map(cleanFilter)
        ),
        must_not: (
          filters
          .filter(filterNegate(true))
          .map(translateToQuery)
          .map(cleanFilter)
        )
      }
    };

    _.each(queries, (q) => {
      request.query.bool.must.push(q);
    });

    // add time
    if (time) {
      request.query.bool.must.push(time);
    }
    return request;
  };
};
