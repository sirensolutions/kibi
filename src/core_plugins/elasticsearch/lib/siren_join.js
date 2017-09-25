import util from './util';
import _ from 'lodash';

export default function sirenJoin(server) {
  const kibiIndex = server.config().get('kibana.index');

  /**
   * Returns the index in relation of the element which is about the given index
   */
  const _getFocusedRelationIndex = function (focus, relation) {
    if (relation[0].pattern === focus) {
      return 0;
    }
    return relation[1].pattern === focus ? 1 : -1;
  };

  // add types for the source index
  const addSourceTypes = function (query, types) {
    if (types) {
      for (let j = 0; j < types.length; j++) {
        query.push({
          type: {
            value: types[j]
          }
        });
      }
    }
  };

  const addJoinToParent = function (query, fjObject, types, negate) {
    // If types are declared in the relation, the filter_join must be enclosed
    // in query.bool containing both the filterjoin and the match on the type.
    if (types) {
      const typeAndJoin = {
        bool: {
          must: [ fjObject ]
        }
      };
      addSourceTypes(typeAndJoin.bool.must, types);
      fjObject = typeAndJoin;
    }
    if (query.constructor === Array) {
      // this join is the root
      query.push(fjObject);
    } else {
      // add to the parent join
      if (negate) {
        if (!_.get(query, 'filter.bool.must_not')) {
          _.set(query, 'filter.bool.must_not', []);
        }
        query.filter.bool.must_not.push(fjObject);
      } else {
        query.filter.bool.must.push(fjObject);
      }
    }
  };

  function _replaceObjects(json, objects) {
    for (let i = objects.length - 1; i >= 0; i--) {
      const path = objects[i].path;
      if (util.length(json, path) !== 1) {
        throw new Error('The object at ' + path.join('.') + ' must only contain the join filter\n' + JSON.stringify(json, null, ' '));
      }
      const label = path[path.length - 1];
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
    const relationFields = [ 'pattern', 'queries', 'path', 'indices', 'types', 'type', 'orderBy', 'limit', 'termsEncoding' ];
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
        _checkRelation(element.relation, relationFields, 'path', 'pattern');
      } else {
        throw new Error('Unknown element: ' + JSON.stringify(element, null, ' '));
      }
    });
  }

  /**
   * Asserts the fields of a relation
   */
  function _checkRelation(relation, fields, ...mandatoryFields) {
    if (relation.constructor !== Array || relation.length !== 2) {
      throw new Error('Expecting a pair of dashboards to join, got: ' + JSON.stringify(relation, null, ' '));
    }
    const _check = function (dashboard, isSource) {
      const keys = _.keys(dashboard);

      for (const mandatoryField of mandatoryFields) {
        if (!_.contains(keys, mandatoryField)) {
          throw new Error(`The field ${mandatoryField} is required`);
        }
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
  }

  /**
   * Create the join from the sequence of relations
   */
  function _sequenceJoins(query, sequence) {
    let curQuery = query;

    for (let i = sequence.length - 1; i > 0; i--) {
      const join = sequence[i].relation;
      const options = {
        query: curQuery,
        sourcePath: join[1].path,
        sourceIndex: join[1],
        targetPath: join[0].path,
        targetIndex: join[0],
        negate: sequence[i].negate,
        type: sequence[i].type,
        limit: sequence[i].limit
      };
      const { child } = _addJoin(options);
      if (!child) {
        return;
      }
      curQuery = child;
      _addFilters(curQuery, join[0].queries);
    }
    if (sequence[0].group) {
      _.each(sequence[0].group, function (seq) {
        _sequenceJoins(curQuery, seq);
      });
    } else {
      const lastJoin = sequence[0].relation;
      const options = {
        query: curQuery,
        sourcePath: lastJoin[1].path,
        sourceIndex: lastJoin[1],
        targetPath: lastJoin[0].path,
        targetIndex: lastJoin[0],
        negate: sequence[0].negate,
        type: sequence[0].type,
        limit: sequence[0].limit
      };
      const { child } = _addJoin(options);
      if (!child) {
        return;
      }
      curQuery = child;
      _addFilters(curQuery, lastJoin[0].queries);
    }
  }

  function _superGraph(relations) {
    const relationFields = [ 'pattern', 'path', 'indices', 'types', 'orderBy', 'limit', 'termsEncoding' ];

    return _(relations)
    .each((relation) => {
      _checkRelation(relation, relationFields, 'path', 'pattern');
      if (relation[0].pattern === relation[1].pattern) {
        throw new Error('Loops in the join_set are not supported!\n' + JSON.stringify(relation, null, ' '));
      }
    })
    .groupBy((relation) => {
      const leftIndex = relation[0].pattern;
      const rightIndex = relation[1].pattern;
      return leftIndex < rightIndex ? leftIndex + rightIndex : rightIndex + leftIndex;
    })
    .value();
  }

  function _expandSuperTree(toExpand) {
    for (let i = toExpand.length - 1; i >= 0; i--) {
      const node = toExpand[i];
      for (let j = 0; j < node.relations.length; j++) {
        const relation = node.relations[j];
        const ind = _getFocusedRelationIndex(node.focus, relation);
        const targetInd = ind === 0 ? 1 : 0;
        const sourceRel = relation[ind];
        const targetRel = relation[targetInd];
        const clone = _.cloneDeep(node.join);

        clone.indices = targetRel.indices;
        clone.on = [ sourceRel.path, targetRel.path ];
        clone.types = targetRel.types;
        if (!clone.types) {
          delete clone.types;
        }
        clone.orderBy = targetRel.orderBy;
        if (!clone.orderBy) {
          delete clone.orderBy;
        }
        clone.termsEncoding = targetRel.termsEncoding;
        if (!clone.termsEncoding) {
          delete clone.termsEncoding;
        }
        clone.limit = targetRel.limit;
        if (!clone.limit || clone.limit === -1) {
          delete clone.limit;
        }

        addJoinToParent(node.parent, { join: clone }, sourceRel.types);
      }
    }
  }

  /**
   * Processes the current focused indexed: adds its own direct filters
   * and the joins as well, if it is connected to any of the other
   * indices.
   */
  function _superGraphToSuperTree(toExpand, query, focus, superGraph, filters, visitedIndices = {}, visitedRelations = {}) {
    if (visitedIndices[focus] === true) {
      return;
    }
    visitedIndices[focus] = true;

    if (filters.hasOwnProperty(focus)) {
      const focusFilters = filters[focus];
      if (query.constructor === Array) {
        for (let i = 0; i < focusFilters.length; i++) {
          if (focusFilters[i].hasOwnProperty('query')) {
            query.push(focusFilters[i].query);
          } else {
            query.push(focusFilters[i]);
          }
        }
      } else {
        _addFilters(query, focusFilters);
      }
    }

    for (const id in superGraph) {
      if (superGraph.hasOwnProperty(id)) {
        const relations = superGraph[id];
        const ind = _getFocusedRelationIndex(focus, relations[0]);
        if (ind !== -1) {
          const targetInd = ind === 0 ? 1 : 0;
          const sourceRel = relations[0][ind];
          const targetRel = relations[0][targetInd];

          if (!visitedRelations[id]) {
            visitedRelations[id] = true;
            const options = {
              query: query,
              sourcePath: sourceRel.path,
              sourceIndex: sourceRel,
              targetPath: targetRel.path,
              targetIndex: targetRel
            };
            const { child, join } = _addJoin(options);
            if (relations.length > 1) {
              toExpand.push({
                focus,
                relations: relations.slice(1),
                parent: query,
                join
              });
            }
            if (!child) {
              return;
            }
            _superGraphToSuperTree(toExpand, child, targetRel.pattern, superGraph, filters, visitedIndices, visitedRelations);
          }
        }
      }
    }
  }

  /**
   * Adds all the filters about the focus
   */
  function _addFilters(query, focusFilters) {
    if (query.constructor !== Object) {
      throw new Error('Query should be an object: ' + JSON.stringify(query, null, ' '));
    }
    if (!focusFilters) {
      return;
    }
    if (focusFilters.constructor !== Array) {
      throw new Error('The queries field must be an array');
    }
    for (let i = 0; i < focusFilters.length; i++) {
      // add the query object to bool.must so that the score is computed
      if (focusFilters[i].hasOwnProperty('query')) {
        query.must.push(focusFilters[i].query);
      } else {
        query.filter.bool.must.push(focusFilters[i]);
      }
    }
  }

  /**
   * Adds a join to the given query, from the source index to the target index
   */
  function _addJoin({ query, sourcePath, sourceIndex, targetPath, targetIndex, negate, type, limit }) {
    if (!targetIndex) {
      throw new Error('The target index must be defined');
    }

    const join = {
      indices: _.isArray(targetIndex.indices) ? targetIndex.indices : [ targetIndex.indices ],
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
    if (targetIndex.types && targetIndex.types.length > 0) {
      join.types = targetIndex.types;
    }
    // NOTE: temporary disabled until there is a version that supports join type
    // if (type) {
    // join.type = type;
    // }
    if (limit) {
      join.limit = limit;
    }

    const child = join.request.query.bool;

    // If there are no target indices, replace the join with a match_none query
    if (join.indices.length === 0) {
      const matchNone = { match_none: {} };
      addJoinToParent(query, matchNone, [], negate);
      return {
        join: matchNone,
        child: null
      };
    }

    addJoinToParent(query, { join }, sourceIndex.types, negate);
    return { join, child };
  }

  /**
   * Generate a Siren join query where the sequence of joins is explicitly defined in the query.
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
   * - pattern: an index pattern from which indices are taken
   * - path: the path to the joined field
   * - indices: an array of indices to join on
   * - types: the corresponding array of types
   * - type: the kind of type to execute
   * - orderBy: the join ordering option
   * - limit: join limit parameter
   * - queries: and array of queries that are applied on the set of indices
   *
   * A relation can be negated by setting the field "negate" to true.
   */
  const sequence = function (json) {
    const label = 'join_sequence';
    const objects = util.traverse(json, label, function (err, sequence) {
      if (err) {
        throw err;
      }
      const query = [];
      _verifySequence(sequence);
      _sequenceJoins(query, sequence);
      return query;
    });
    _replaceObjects(json, objects);
    return json;
  };

  /**
   * Generate a Siren join query based on the given relations with the focused index as the root of the query.
   * The joins and their order is decided based on the given focus.
   *
   * A join_set is an object with the following fields:
   * - focus: the focused index as a string
   * - relations: an array of relations. A relation is an array with two objects, each describing one end of a join.
   *   This object contains the following fields:
   *     - pattern: an index pattern
   *     - indices: an array of indices to join on
   *     - types: the corresponding array of types
   *     - path: the path to the joined field
   *     - orderBy: the join ordering option
   *     - limit: join limit parameter
   * - queries: the queries for each index/dashboard as an object. The queries are within an array for each pair.
   */
  const set = function (json) {
    const label = 'join_set';
    const objects = util.traverse(json, label, function (err, data) {
      if (err) {
        throw err;
      }

      const focus = data.focus;
      const relations = data.relations;
      let queries = data.queries || {};

      if (focus === undefined) {
        throw new Error('Missing focus field in the join object: ' + JSON.stringify(data, null, ' '));
      }
      if (relations === undefined) {
        throw new Error('Missing relations field in the join object: ' + JSON.stringify(data, null, ' '));
      }

      const query = [];
      const superGraph = _superGraph(relations);
      const toExpand = [];
      queries = _.mapValues(queries, perDashboards => _(perDashboards).values().flatten().uniq().compact().value());
      _superGraphToSuperTree(toExpand, query, focus, superGraph, queries);
      _expandSuperTree(toExpand);
      return query;
    });
    _replaceObjects(json, objects);
    return json;
  };

  return {
    set,
    sequence
  };
}
