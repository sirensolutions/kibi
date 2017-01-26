import { get, set } from 'lodash';

/**
 * addSourceTypes adds the types information for the source index of the join
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

/**
 * JoinBuilder creates a siren join query
 *
 * @param orderBy orderBy join parameter
 * @param maxTermsPerShard maxTermsPerShard join parameter
 * @param termsEncoding termsEncoding join parameter
 * @param sourcePath join path in the source index
 * @param targetPath join path in the target index
 * @param targetIndices indices to join on
 * @param targetTypes types of the target indices
 * @returns this JoinBuilder instance
 */
class JoinBuilder {
  constructor({ orderBy, maxTermsPerShard, termsEncoding, sourcePath, targetIndices, targetTypes, targetPath }) {
    const join = {
      indices: targetIndices,
      on: [ sourcePath, targetPath ],
      request: {
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
      }
    };
    if (targetTypes) {
      if (targetTypes.constructor === Array) {
        join.types = targetTypes;
      } else {
        join.types = [ targetTypes ];
      }
    }
    if (orderBy) {
      join.orderBy = orderBy;
    }
    if (maxTermsPerShard && maxTermsPerShard > -1) {
      join.maxTermsPerShard = maxTermsPerShard;
    }
    if (termsEncoding) {
      join.termsEncoding = termsEncoding;
    }

    this.fjQuery = [ { join } ];
    this.join = join;
  }

  /**
   * addJoin adds a join query to be nested in the parent one
   */
  addJoin({ orderBy, maxTermsPerShard, termsEncoding, sourceTypes, sourcePath, targetIndices, negate, targetTypes, targetPath }) {
    const joinBuilder = new JoinBuilder({
      orderBy,
      maxTermsPerShard,
      termsEncoding,
      sourcePath,
      targetIndices,
      targetTypes,
      targetPath
    });
    const query = this.join.request.query.bool;
    // add to the parent join
    if (negate) {
      if (!get(query, 'filter.bool.must_not')) {
        set(query, 'filter.bool.must_not', [{
          bool: {
            must: []
          }
        }]);
      }
      query.filter.bool.must_not[0].bool.must.push(joinBuilder);
      addSourceTypes(query.filter.bool.must_not[0].bool.must, sourceTypes);
    } else {
      query.filter.bool.must.push(joinBuilder);
      addSourceTypes(query.filter.bool.must, sourceTypes);
    }
    return joinBuilder;
  }

  /**
   * addQuery adds a query to the nested join
   *
   * @param q the query object
   * @param negate = false whether or not to negate that query
   */
  addQuery(q, negate = false) {
    if (negate) {
      // add the query object to bool.must so that the score is computed
      if (q.hasOwnProperty('query')) {
        if (!this.join.request.query.bool.must_not) {
          this.join.request.query.bool.must_not = [];
        }
        this.join.request.query.bool.must_not.push(q);
      } else {
        if (!this.join.request.query.bool.filter.bool.must_not) {
          this.join.request.query.bool.filter.bool.must_not = [];
        }
        this.join.request.query.bool.filter.bool.must_not.push(q);
      }
    } else {
      // add the query object to bool.must so that the score is computed
      if (q.hasOwnProperty('query')) {
        this.join.request.query.bool.must.push(q.query);
      } else {
        this.join.request.query.bool.filter.bool.must.push(q);
      }
    }
    return this;
  }
}

export default class Builder {
  constructor() {
    this.query = [];
  }

  /**
   * Clear the builder so it can be reused
   */
  clear() {
    this.query = [];
  }

  /**
   * toObject returns the query object
   */
  toObject() {
    const expand = function (queryOut, query) {
      for (let i = 0; i < query.length; i++) {
        if (query[i] instanceof JoinBuilder) {
          // must branch of the child
          const must = query[i].join.request.query.bool.filter.bool.must;
          if (must) {
            query[i].join.request.query.bool.filter.bool.must = expand([], must);
          }
          // must_not branch of the child
          const mustNot = query[i].join.request.query.bool.filter.bool.must_not;
          if (mustNot && mustNot[0].bool) {
            mustNot[0].bool.must = expand([], mustNot[0].bool.must);
          }
          // the current join query
          queryOut.push(...query[i].fjQuery);
        } else {
          queryOut.push(query[i]);
        }
      }
      return queryOut;
    };

    return expand([], this.query);
  }

  /**
   * addQuery adds the given query object
   */
  addQuery(q) {
    this.query.push(q);
    return this;
  }

  /**
   * addJoin adds a join query
   */
  addJoin({ orderBy, maxTermsPerShard, termsEncoding, sourceTypes, sourcePath, targetIndices, targetTypes, targetPath }) {
    const joinBuilder = new JoinBuilder({
      orderBy,
      maxTermsPerShard,
      termsEncoding,
      sourcePath,
      targetIndices,
      targetTypes,
      targetPath
    });
    addSourceTypes(joinBuilder.fjQuery, sourceTypes);
    this.query.push(joinBuilder);
    return joinBuilder;
  }
}
