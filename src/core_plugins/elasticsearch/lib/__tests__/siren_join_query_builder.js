import { get, set, forIn, isArray, isObject } from 'lodash';

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
 * @param type string the kind of join to execute
 * @returns this JoinBuilder instance
 */
class JoinBuilder {
  constructor({ orderBy, maxTermsPerShard, termsEncoding, type, sourcePath, targetIndices, targetTypes, targetPath }) {
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
    if (type) {
      join.type = type;
    }
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
  addJoin({ orderBy, maxTermsPerShard, termsEncoding, type, sourceTypes, sourcePath, targetIndices, negate, targetTypes, targetPath }) {
    const joinBuilder = new JoinBuilder({
      orderBy,
      maxTermsPerShard,
      termsEncoding,
      type,
      sourcePath,
      targetIndices,
      targetTypes,
      targetPath
    });
    const query = this.join.request.query.bool;

    let join = joinBuilder;
    if (sourceTypes) {
      join = {
        bool: {
          must: [ joinBuilder ]
        }
      };
      addSourceTypes(join.bool.must, sourceTypes);
    }
    // add to the parent join
    if (negate) {
      if (!get(query, 'filter.bool.must_not')) {
        set(query, 'filter.bool.must_not', []);
      }
      query.filter.bool.must_not.push(join);
    } else {
      query.filter.bool.must.push(join);
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
    const replace = function (obj) {
      if (obj instanceof JoinBuilder) {
        return replace(obj.fjQuery);
      } else if (isArray(obj)) {
        const values = obj.splice(0, obj.length);
        values.forEach((value) => {
          if (value instanceof JoinBuilder) {
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
  addJoin({ orderBy, maxTermsPerShard, termsEncoding, type, sourceTypes, sourcePath, targetIndices, targetTypes, targetPath }) {
    const joinBuilder = new JoinBuilder({
      orderBy,
      maxTermsPerShard,
      termsEncoding,
      type,
      sourcePath,
      targetIndices,
      targetTypes,
      targetPath
    });
    if (sourceTypes) {
      const typeAndJoin = {
        bool: {
          must: [ joinBuilder ]
        }
      };
      addSourceTypes(typeAndJoin.bool.must, sourceTypes);
      this.query.push(typeAndJoin);
    } else {
      this.query.push(joinBuilder);
    }
    return joinBuilder;
  }
}
