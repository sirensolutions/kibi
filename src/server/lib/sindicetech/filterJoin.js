var util = require('./util');
var _ = require('lodash');

/**
 * Generate a SIREn filterjoin query based on the given relations with the focused index as the root of the query.
 * The sequence of joins is explicitly defined in the query.
 *
 * A filterjoin is an object with the following fields:
 * - focus: the focused index as a string
 * - relations: the sequence of relations. It is an array with each element being an array that describes the graph.
 *   A graph is a collection of arrays that represent a connection between two indices. An edge is a path to the join
 *   field in an index.
 *   For example, a sequence can be as follows:
 *      [
 *        [
 *          [ "b.id", "c.bid" ],
 *          [ "b.id", "d.bid" ]
 *        ],
 *        [
 *          [ "a.id", "b.aid" ]
 *        ]
 *      ]
 *   This sequence has two graphs, the first one has one edge, and the second has two edges.
 *   The sequence is read in **reverse**.
 * - filters: the filters for each index as an array of object, each object with entries being the index names. There
 *   should be as many filters as there are elements in the sequence. The filters and relations arrays go in pair.
 * - indexes: the list of indexes involved in the filterjoin query. This is an array of object, each object describing
 *   an index by specifying two properties, i.e., the id and the type of index.
 */
exports.sequence = function (json) {
  var label = 'join_sequence';
  var objects = util.traverse(json, label, function (err, sequence) {
    if (err) {
      throw err;
    }

    if (!sequence || sequence.constructor !== Array || sequence.length === 0) {
      throw new Error('Specify the join sequence: ' + JSON.stringify(sequence, null, ' '));
    }
    if (sequence.length < 2) {
      throw new Error('Sequence must have at least two elements');
    }

    var query = [];
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
    util.delete(json, path.slice(0, path.length - 1), path[path.length - 1]);
    util.addAll(json, path.slice(0, path.length - 1), objects[i].value);
  }
}

/**
 * Create the filterjoin from the sequence of relations
 */
function _sequenceJoins(query, sequence) {
  var ind = sequence.length - 1;

  if (!!sequence[ind].queries) {
    throw new Error('Queries for the root node are already set');
  }
  var curQuery = _addFilterJoin(query, sequence[ind].path, sequence[ind - 1].path, sequence[ind - 1]);
  _addFilters(curQuery, sequence[ind - 1].queries);
  for (var i = ind - 2; i >= 0; i--) {
    curQuery = _addFilterJoin(curQuery, sequence[i + 1].path, sequence[i].path, sequence[i]);
    _addFilters(curQuery, sequence[i].queries);
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
        var ti = _.find(indexes, { id: targetIndex });
        ti.indices = [ targetIndex ];
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
  var types = [];
  var orderBy;
  var maxTermsPerShard;

  if (!targetIndex) {
    throw new Error('The target index must be defined');
  }
  if (targetIndex.type) {
    types.push(targetIndex.type);
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
  if (types.length > 0) {
    filterJoin.types = types;
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
  if (!focusFilters) {
    return;
  }
  if (focusFilters.constructor !== Array) {
    throw new Error('The queries field must be an array');
  }
  for (var i = 0; i < focusFilters.length; i++) {
    if (query.constructor === Array) {
      query.push(focusFilters[i]);
    } else {
      // add the query object to filtered.query so that the score is computed
      if (focusFilters[i].hasOwnProperty('query')) {
        query.query.bool.must.push(focusFilters[i].query);
      } else {
        query.filter.bool.must.push(focusFilters[i]);
      }
    }
  }
}
