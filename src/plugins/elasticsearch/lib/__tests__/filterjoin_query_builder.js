import { get, set } from 'lodash';

function Builder() {
  this.query = [];
  return this;
}

/**
 * Clear the builder so it can be reused
 */
Builder.prototype.clear = function () {
  this.query = [];
};

/**
 * toObject returns the query object
 */
Builder.prototype.toObject = function () {
  const expand = function (queryOut, query) {
    for (let i = 0; i < query.length; i++) {
      if (query[i] instanceof FilterJoinBuilder) {
        // must branch of the child
        const must = query[i].filterjoin.query.bool.filter.bool.must;
        if (must) {
          query[i].filterjoin.query.bool.filter.bool.must = expand([], must);
        }
        // must_not branch of the child
        const mustNot = query[i].filterjoin.query.bool.filter.bool.must_not;
        if (mustNot && mustNot[0].bool) {
          mustNot[0].bool.must = expand([], mustNot[0].bool.must);
        }
        // the current filterjoin query
        queryOut.push(...query[i].fjQuery);
      } else {
        queryOut.push(query[i]);
      }
    }
    return queryOut;
  };

  return expand([], this.query);
};

/**
 * addQuery adds the given query object
 */
Builder.prototype.addQuery = function (q) {
  this.query.push(q);
  return this;
};

/**
 * addFilterJoin adds a filterjoin query
 */
Builder.prototype.addFilterJoin = function ({ orderBy, maxTermsPerShard, termsEncoding, sourceTypes, sourcePath, targetIndices, targetTypes,
                                            targetPath }) {
  const filterJoinBuilder = new FilterJoinBuilder({
    orderBy,
    maxTermsPerShard,
    termsEncoding,
    sourcePath,
    targetIndices,
    targetTypes,
    targetPath
  });
  addSourceTypes(filterJoinBuilder.fjQuery, sourceTypes);
  this.query.push(filterJoinBuilder);
  return filterJoinBuilder;
};

function FilterJoinBuilder({ orderBy, maxTermsPerShard, termsEncoding, sourcePath, targetIndices, targetTypes, targetPath }) {
  const filterJoin = {
    indices: targetIndices,
    path: targetPath,
    query: {
      bool: {
        must: [
          {
            match_all: {}
          }
        ],
        filter: {
          bool: {
            must: []
          }
        }
      }
    }
  };
  if (targetTypes) {
    if (targetTypes.constructor === Array) {
      filterJoin.types = targetTypes;
    } else {
      filterJoin.types = [ targetTypes ];
    }
  }
  if (orderBy) {
    filterJoin.orderBy = orderBy;
  }
  if (maxTermsPerShard && maxTermsPerShard > -1) {
    filterJoin.maxTermsPerShard = maxTermsPerShard;
  }
  if (termsEncoding) {
    filterJoin.termsEncoding = termsEncoding;
  }
  const fjObject = {
    filterjoin: {}
  };
  fjObject.filterjoin[sourcePath] = filterJoin;

  this.fjQuery = [ fjObject ];
  this.filterjoin = filterJoin;
  return this;
}

/**
 * Adds a filterjoin query to be nested in the parent one
 */
FilterJoinBuilder.prototype.addFilterJoin = function ({ orderBy, maxTermsPerShard, termsEncoding, sourceTypes, sourcePath, targetIndices,
                                                      negate, targetTypes, targetPath }) {
  const filterJoinBuilder = new FilterJoinBuilder({
    orderBy,
    maxTermsPerShard,
    termsEncoding,
    sourcePath,
    targetIndices,
    targetTypes,
    targetPath
  });
  const query = this.filterjoin.query.bool;
  // add to the parent filterjoin
  if (negate) {
    if (!get(query, 'filter.bool.must_not')) {
      set(query, 'filter.bool.must_not', [{
        bool: {
          must: []
        }
      }]);
    }
    query.filter.bool.must_not[0].bool.must.push(filterJoinBuilder);
    addSourceTypes(query.filter.bool.must_not[0].bool.must, sourceTypes);
  } else {
    query.filter.bool.must.push(filterJoinBuilder);
    addSourceTypes(query.filter.bool.must, sourceTypes);
  }
  return filterJoinBuilder;
};

/**
 * addQuery adds a query to the nested filterjoin
 *
 * @param q the query object
 * @param negate = false whether or not to negate that query
 */
FilterJoinBuilder.prototype.addQuery = function (q, negate = false) {
  if (negate) {
    // add the query object to bool.must so that the score is computed
    if (q.hasOwnProperty('query')) {
      if (!this.filterjoin.query.bool.must_not) {
        this.filterjoin.query.bool.must_not = [];
      }
      this.filterjoin.query.bool.must_not.push(q);
    } else {
      if (!this.filterjoin.query.bool.filter.bool.must_not) {
        this.filterjoin.query.bool.filter.bool.must_not = [];
      }
      this.filterjoin.query.bool.filter.bool.must_not.push(q);
    }
  } else {
    // add the query object to bool.must so that the score is computed
    if (q.hasOwnProperty('query')) {
      this.filterjoin.query.bool.must.push(q.query);
    } else {
      this.filterjoin.query.bool.filter.bool.must.push(q);
    }
  }
  return this;
};

/**
 * addSourceTypes adds the types information for the source index of the filterjoin
 *
 * @param query the query to add the type clause to https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-type-query.html
 * @param types the set of types
 */
function addSourceTypes(query, types) {
  if (types) {
    if (types.constructor === Array) {
      for (let i = 0; i < types.length; i++) {
        query.push({
          type: {
            value: types[i]
          }
        });
      }
    } else {
      query.push({
        type: {
          value: types
        }
      });
    }
  }
}

module.exports = Builder;
