import { get, set, forIn, isArray, isObject } from 'lodash';

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
  const replace = function (obj) {
    if (obj instanceof FilterJoinBuilder) {
      return replace(obj.fjQuery);
    } else if (isArray(obj)) {
      const values = obj.splice(0, obj.length);
      values.forEach((value) => {
        if (value instanceof FilterJoinBuilder) {
          replace(value).forEach(result => obj.push(result));
        } else {
          obj.push(replace(value));
        }
      });
      return obj;
    } else if (isObject(obj)) {
      forIn(obj, (child, key) => {
        obj[key] = replace(child);
      });
    }
    return obj;
  };

  return replace(this.query);
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
  if (sourceTypes) {
    const typeAndJoin = {
      bool: {
        must: [filterJoinBuilder]
      }
    };
    addSourceTypes(typeAndJoin.bool.must, sourceTypes);
    this.query.push(typeAndJoin);
  } else {
    this.query.push(filterJoinBuilder);
  }
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

  let filterJoin = filterJoinBuilder;
  if (sourceTypes) {
    filterJoin = {
      bool: {
        must: [filterJoinBuilder]
      }
    };
    addSourceTypes(filterJoin.bool.must, sourceTypes);
  }
  // add to the parent filterjoin
  if (negate) {
    if (!get(query, 'filter.bool.must_not')) {
      set(query, 'filter.bool.must_not', []);
    }
    query.filter.bool.must_not.push(filterJoin);
  } else {
    query.filter.bool.must.push(filterJoin);
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
