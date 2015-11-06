var util = require('./util');
var _ = require('lodash');

/**
 * Generate a SIREn filterjoin query where the sequence of joins is explicitly defined in the query.
 *
 * A join_sequence is an array where each element is either:
 * 1. a node of the join sequence; or
 * 2. another sequence.
 *
 * A sequence can be nested by adding to an array as the first element of the sequence it is nested in.
 * For example, the sequence [ node1, node2 ] can be nested in the sequence [ node3, node4 ] as follows:
 *    {
 *      join_sequence: [
 *        [
 *          [ node1, node2 ]
 *        ],
 *        node3,
 *        node4
 *      ]
 *    }
 *
 * Each node of a sequence contains the following fields:
 * - path: the path to the joined field
 * - indices: an array of indices to join on
 * - types: the corresponding array of types
 * - orderBy: the filterjoin ordering option
 * - maxTermsPerShard: the maximum number of terms to consider in the filterjoin
 * - queries: and array of queries that are applied on the set of indices
 */
exports.sequence = function (json) {
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
 *
 * A filterjoin is an object with the following fields:
 * - focus: the focused index as a string
 * - relations: the relation graph of indices as an array of arrays, each array being an edge between two indices. An
 *   edge is a path to the join field in an index.
 *   For example it can be [ [ "a.id", "b.aid" ] ], which means that there is a join between indexes "a" and "b", on
 *   the fields "id" of "a" and "aid" of "b".
 * - filters: the filters for each index as an object, which entries are the index names
 * - indexes: the list of indexes involved in the filterjoin query. This is an array of object, each object describing
 *   an index by specifying two properties, i.e., the id and the type of index.
 */
exports.set = function (json) {
  var label = 'join';
  var objects = util.traverse(json, label, function (err, data) {
    if (err) {
      throw err;
    }

    var focus = data.focus;
    var relations = data.relations;
    var filters = data.filters;
    var indexes = data.indexes;

    if (focus === undefined) {
      throw new Error('Missing focus field in the join object: ' + JSON.stringify(data, null, ' '));
    }
    if (indexes === undefined) {
      throw new Error('Missing indexes field in the join object: ' + JSON.stringify(data, null, ' '));
    }
    if (relations === undefined) {
      throw new Error('Missing relations field in the join object: ' + JSON.stringify(data, null, ' '));
    }
    if (filters === undefined) {
      filters = {};
    }

    var query = [];
    _process(query, focus, relations, filters, indexes, {});
    return query;
  });
  _replaceObjects(json, objects);
  return json;
};

function _replaceObjects(json, objects) {
  for (var i = 0; i < objects.length; i++) {
    var path = objects[i].path;
    if (util.length(json, path) !== 1) {
      throw new Error('The object at ' + JSON.stringify(path, null, ' ') + ' must only contain the join filter');
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

  if (sequence.length < 2) {
    throw new Error('Sequence must have at least two elements');
  }

  // check element of the sequence
  _.each(sequence, function (element, index) {
    if (element.constructor === Array) {
      if (index !== 0) {
        throw new Error('There can be only one sequence object and it must be the first element of the array');
      }
      if (sequence.length < 3) {
        throw new Error('Missing elements! only got: ' + JSON.stringify(sequence, null, ' '));
      }
      _.each(element, function (seq) {
        _verifySequence(seq);
      });
    } else {
      var keys = _.keys(element);

      if (!_.contains(keys, 'path')) {
        throw new Error('The join path is required');
      }
      _.each(keys, function (key) {
        if (key === 'queries' && index === sequence.length - 1) {
          throw new Error('Queries for the root node should be already set: ' + JSON.stringify(element, null, ' '));
        }
        switch (key) {
          case 'queries':
          case 'path':
          case 'indices':
          case 'types':
          case 'orderBy':
          case 'maxTermsPerShard':
            break;
          default:
            throw new Error('Got unknown field [' + key + '] in ' + JSON.stringify(element, null, ' '));
        }
      });
    }
  });
}

/**
 * Create the filterjoin from the sequence of relations
 */
function _sequenceJoins(query, sequence) {
  var ind = sequence.length - 1;
  var curQuery = query;

  for (var i = ind - 1; i > 0; i--) {
    curQuery = _addFilterJoin(curQuery, sequence[i + 1].path, sequence[i].path, sequence[i]);
    _addFilters(curQuery, sequence[i].queries);
  }
  if (sequence[0].constructor === Array) {
    _.each(sequence[0], function (seq) {
      _sequenceJoins(curQuery.filter.bool.must, seq);
    });
  } else {
    curQuery = _addFilterJoin(curQuery, sequence[1].path, sequence[0].path, sequence[0]);
    _addFilters(curQuery, sequence[0].queries);
  }
}

/**
 * Processes the current focused indexed: adds its own direct filters
 * and the filterjoins as well, if it is connected to any of the other
 * indices.
 */
function _process(query, focus, relations, filters, indexes, visitedIndices) {
  if (visitedIndices[focus] === true) {
    return;
  }
  visitedIndices[focus] = true;

  var dotFocus = focus + '.';

  if (filters.hasOwnProperty(focus)) {
    if (query.constructor === Array) {
      throw new Error('There cannot be filters on the root of the filterjoin');
    }
    var focusFilters = filters[focus];
    _addFilters(query, focusFilters);
  }
  for (var i = 0; i < relations.length; i++) {
    if (relations[i].length !== 2) {
      throw new Error('Expected relation entry with 2 elements: got ' + relations[i]);
    }
    var ind = _getFocusedRelationIndex(dotFocus, relations[i]);
    if (ind !== -1) {
      var targetInd = ind === 0 ? 1 : 0;
      var sourceRel = relations[i][ind];
      var targetRel = relations[i][targetInd];

      // path in the source indices
      var sourceDot = sourceRel.indexOf('.');
      if (sourceDot === -1) {
        throw new Error('Missing dot in [' + sourceRel + ']');
      }
      var sourcePath = sourceRel.substr(sourceDot + 1);

      // path in target indices
      var targetDot = targetRel.indexOf('.');
      if (targetDot === -1) {
        throw new Error('Missing dot in [' + targetRel + ']');
      }
      var targetPath = targetRel.substr(targetDot + 1);

      // TODO update the definition of the indexes array
      var targetIndex = targetRel.substr(0, targetDot);
      if (!visitedIndices.hasOwnProperty(targetIndex)) {
        // TODO the following will be removed with GH#382
        var ti = _.find(indexes, { id: targetIndex });
        ti.indices = [ targetIndex ];
        ti.types = ti.type ? [ ti.type ] : [];
        var childFilters = _addFilterJoin(query, sourcePath, targetPath, ti);
        _process(childFilters, targetIndex, relations, filters, indexes, visitedIndices);
      }
    }
  }
}

/**
 * Adds a filterjoin filter to the given query, from the source index to the target index
 */
function _addFilterJoin(query, sourcePath, targetPath, targetIndex) {
  var orderBy;
  var maxTermsPerShard;

  if (!targetIndex) {
    throw new Error('The target index must be defined');
  }
  orderBy = targetIndex.orderBy;
  maxTermsPerShard = targetIndex.maxTermsPerShard;

  var filterJoin = {
    indices: targetIndex.indices,
    path: targetPath,
    query: {
      filtered: {
        query: {
          bool: {
            must: [
              {
                match_all: {}
              }
            ]
          }
        },
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
  if (maxTermsPerShard) {
    filterJoin.maxTermsPerShard = maxTermsPerShard;
  }
  var fjObject = {
    filterjoin: {}
  };
  fjObject.filterjoin[sourcePath] = filterJoin;
  if (query.constructor === Array) {
    // this filterjoin is the root
    query.push(fjObject);
  } else {
    // add to the parent filterjoin
    query.filter.bool.must.push(fjObject);
  }
  return filterJoin.query.filtered;
}

/**
 * Returns the index in relation of the element which is about the given index
 */
function _getFocusedRelationIndex(focus, relation) {
  for (var i = 0; i < relation.length; i++) {
    if (relation[i].indexOf(focus) === 0) {
      return i;
    }
  }
  return -1;
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
    // add the query object to filtered.query so that the score is computed
    if (focusFilters[i].hasOwnProperty('query')) {
      query.query.bool.must.push(focusFilters[i].query);
    } else {
      query.filter.bool.must.push(focusFilters[i]);
    }
  }
}
