var util = require('./util');
var _ = require('lodash');

export default function (server) {

  /**
   * Generate a SIREn filterjoin query where the sequence of joins is explicitly defined in the query.
   *
   * A join_sequence is an array where each element is either:
   * 1. a node of the join sequence; or
   * 2. another sequence.
   *
   * A sequence can be nested by adding an object which field name is "group", and its value the sequence to nest.
   * For example, the sequence [ node1, node2 ] can be nested in the sequence [ node3, node4 ] as follows:
   *    {
   *      join_sequence: [
   *        {
   *          group: [
   *            [ node1, node2 ]
   *          ]
   *        },
   *        node3,
   *        node4
   *      ]
   *    }
   *
   * Each node of a sequence is a relation that connects two dashboards. The relation is directed: [ node1, node2 ] is
   * a join from node2 to node1.
   * A dashboard is an object that contains the following fields:
   * - path: the path to the joined field
   * - indices: an array of indices to join on
   * - types: the corresponding array of types
   * - orderBy: the filterjoin ordering option
   * - maxTermsPerShard: the maximum number of terms to consider in the filterjoin
   * - queries: and array of queries that are applied on the set of indices
   *
   * A relation can be negated by setting the field "negate" to true.
   */
  const sequence = function (json) {
    var label = 'join_sequence';
    var objects = util.traverse(json, label, function (err, sequence) {
      if (err) {
        throw err;
      }

      var query = [];
      _verifySequence(sequence);
      _sequenceJoins(query, sequence);
      return query;
    });
    _replaceObjects(json, objects);
    return json;
  };

  /**
   * Generate a SIREn filterjoin query based on the given relations with the focused index as the root of the query.
   * The joins and their order is decided based on the given focus.
   *
   * A filterjoin is an object with the following fields:
   * - focus: the focused index as a string
   * - relations: an array of relations. A relation is an array with two objects, each describing one end of a join.
   *   This object contains the following fields:
   *     - path: the path to the joined field
   *     - indices: an array of indices to join on
   *     - types: the corresponding array of types
   *     - orderBy: the filterjoin ordering option
   *     - maxTermsPerShard: the maximum number of terms to consider in the filterjoin
   * - queries: the queries for each index as an object, which entries are the index names
   */
  const set = function (json) {
    var label = 'join_set';
    var objects = util.traverse(json, label, function (err, data) {
      if (err) {
        throw err;
      }

      var focus = data.focus;
      var relations = data.relations;
      var queries = data.queries;

      if (focus === undefined) {
        throw new Error('Missing focus field in the join object: ' + JSON.stringify(data, null, ' '));
      }
      if (relations === undefined) {
        throw new Error('Missing relations field in the join object: ' + JSON.stringify(data, null, ' '));
      }
      if (queries === undefined) {
        queries = {};
      }

      var query = [];
      _process(query, focus, relations, queries, {});
      return query;
    });
    _replaceObjects(json, objects);
    return json;
  };

  function _replaceObjects(json, objects) {
    for (var i = objects.length - 1; i >= 0; i--) {
      var path = objects[i].path;
      if (util.length(json, path) !== 1) {
        throw new Error('The object at ' + path.join('.') + ' must only contain the join filter\n' + JSON.stringify(json, null, ' '));
      }
      var label = path[path.length - 1];
      util.replace(json, path.slice(0, path.length - 1), label, label, objects[i].value);
    }
  }

  /**
   * Checks that the sequence of joins is valid
   */
  function _verifySequence(sequence) {
    if (!sequence || sequence.constructor !== Array) {
      throw new Error('The join sequence must be an array. Got: ' + JSON.stringify(sequence, null, ' '));
    }

    if (sequence.length === 0) {
      throw new Error('Specify the join sequence: ' + JSON.stringify(sequence, null, ' '));
    }

    // check element of the sequence
    _.each(sequence, function (element, index) {
      if (element.group) {
        if (index !== 0) {
          throw new Error('There can be only one sequence object and it must be the first element of the array');
        }
        if (sequence.length < 2) {
          throw new Error('Missing elements! only got: ' + JSON.stringify(sequence, null, ' '));
        }
        _.each(element.group, function (seq) {
          _verifySequence(seq);
        });
      } else if (element.relation) {
        _checkRelation(element.relation, [ 'queries', 'path', 'indices', 'types', 'orderBy', 'maxTermsPerShard', 'termsEncoding' ]);
      } else {
        throw new Error('Unknown element: ' + JSON.stringify(element, null, ' '));
      }
    });
  }

  /**
   * Asserts the fields of a relation
   */
  function _checkRelation(relation, fields, maxIndices) {
    if (relation.constructor !== Array || relation.length !== 2) {
      throw new Error('Expecting a pair of dashboards to join, got: ' + JSON.stringify(relation, null, ' '));
    }
    var _check = function (dashboard) {
      var keys = _.keys(dashboard);

      if (!_.contains(keys, 'path')) {
        throw new Error('The join path is required');
      }
      _.each(keys, function (key) {
        if (fields.indexOf(key) === -1) {
          throw new Error('Got unknown field [' + key + '] in ' + JSON.stringify(dashboard, null, ' '));
        }
      });
    };

    _check(relation[0]);
    _check(relation[1]);

    if (!!relation[1].queries) {
      throw new Error('Queries for the root node should be already set: ' + JSON.stringify(relation, null, ' '));
    }
    if (maxIndices && relation[0].indices && maxIndices < relation[0].indices.length) {
      throw new Error('Too many indices. Expected to have only ' + maxIndices + ' but got '
        + JSON.stringify(relation[0].indices, null, ' '));
    }
    if (maxIndices && relation[1].indices && maxIndices < relation[1].indices.length) {
      throw new Error('Too many indices. Expected to have only ' + maxIndices + ' but got '
        + JSON.stringify(relation[1].indices, null, ' '));
    }
  }

  /**
   * Create the filterjoin from the sequence of relations
   */
  function _sequenceJoins(query, sequence) {
    var curQuery = query;

    for (var i = sequence.length - 1; i > 0; i--) {
      var join = sequence[i].relation;
      curQuery = _addFilterJoin(curQuery, join[1].path, join[0].path, join[0], sequence[i].negate);
      if (!curQuery) {
        return;
      }
      _addFilters(curQuery, join[0].queries);
    }
    if (sequence[0].group) {
      _.each(sequence[0].group, function (seq) {
        _sequenceJoins(curQuery.filter.bool.must, seq);
      });
    } else {
      var lastJoin = sequence[0].relation;
      curQuery = _addFilterJoin(curQuery, lastJoin[1].path, lastJoin[0].path, lastJoin[0], sequence[0].negate);
      if (!curQuery) {
        return;
      }
      _addFilters(curQuery, lastJoin[0].queries);
    }
  }

  /**
   * Processes the current focused indexed: adds its own direct filters
   * and the filterjoins as well, if it is connected to any of the other
   * indices.
   */
  function _process(query, focus, relations, filters, visitedIndices) {
    if (visitedIndices[focus] === true) {
      return;
    }
    visitedIndices[focus] = true;

    if (filters.hasOwnProperty(focus)) {
      if (query.constructor === Array) {
        throw new Error('There cannot be filters on the root of the filterjoin');
      }
      var focusFilters = filters[focus];
      _addFilters(query, focusFilters);
    }
    for (var i = 0; i < relations.length; i++) {
      _checkRelation(relations[i], [ 'path', 'indices', 'types', 'orderBy', 'maxTermsPerShard', 'termsEncoding' ], 1);
      if (relations[i][0].indices[0] === relations[i][1].indices[0]) {
        throw new Error('Loops in the join_set are not supported!\n' + JSON.stringify(relations[i], null, ' '));
      }
      var ind = _getFocusedRelationIndex(focus, relations[i]);
      if (ind !== -1) {
        var targetInd = ind === 0 ? 1 : 0;
        var sourceRel = relations[i][ind];
        var targetRel = relations[i][targetInd];

        if (!visitedIndices.hasOwnProperty(targetRel.indices[0])) {
          var childFilters = _addFilterJoin(query, sourceRel.path, targetRel.path, targetRel);
          if (!childFilters) {
            return;
          }
          _process(childFilters, targetRel.indices[0], relations, filters, visitedIndices);
        }
      }
    }
  }

  /**
   * Adds a filterjoin filter to the given query, from the source index to the target index
   */
  function _addFilterJoin(query, sourcePath, targetPath, targetIndex, negate) {
    if (!targetIndex) {
      throw new Error('The target index must be defined');
    }
    var orderBy = targetIndex.orderBy;
    var maxTermsPerShard = targetIndex.maxTermsPerShard;
    var termsEncoding = targetIndex.termsEncoding;

    var filterJoin = {
      indices: targetIndex.indices,
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
    if (targetIndex.types && targetIndex.types.length > 0) {
      filterJoin.types = targetIndex.types;
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
    var fjObject = {
      filterjoin: {}
    };

    let child = filterJoin.query.bool;

    // If there are no target indices, set the query to return no results.
    if (targetIndex.indices.length === 0) {
      filterJoin.indices = [server.config().get('kibana.index')];
      filterJoin.query = {
        bool: {
          must_not: [
            { match_all: {} }
          ]
        }
      };
      child = null;
    }

    fjObject.filterjoin[sourcePath] = filterJoin;
    if (query.constructor === Array) {
      // this filterjoin is the root
      query.push(fjObject);
    } else {
      // add to the parent filterjoin
      if (negate) {
        if (!query.filter.bool.must_not) {
          query.filter.bool.must_not = [];
        }
        query.filter.bool.must_not.push(fjObject);
      } else {
        query.filter.bool.must.push(fjObject);
      }
    }
    return child;
  }

  /**
   * Returns the index in relation of the element which is about the given index
   */
  function _getFocusedRelationIndex(focus, relation) {
    if (relation[0].indices[0] === focus) {
      return 0;
    }
    return relation[1].indices[0] === focus ? 1 : -1;
  }

  /**
   * Adds all the filters about the focus
   */
  function _addFilters(query, focusFilters) {
    if (query.constructor !== Object) {
      throw new Error('Query should be an object');
    }
    if (!focusFilters) {
      return;
    }
    if (focusFilters.constructor !== Array) {
      throw new Error('The queries field must be an array');
    }
    for (var i = 0; i < focusFilters.length; i++) {
      // add the query object to bool.must so that the score is computed
      if (focusFilters[i].hasOwnProperty('query')) {
        query.must.push(focusFilters[i].query);
      } else {
        query.filter.bool.must.push(focusFilters[i]);
      }
    }
  }

  return {
    set,
    sequence
  };

}
