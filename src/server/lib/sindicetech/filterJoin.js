var util = require('./util');

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
      filters = [];
      for (var i = 0; i < relations.length; i++) {
        filters.push({});
      }
    }
    if (relations.length !== filters.length) {
      throw new Error('The relations and filters arrays must have the same length');
    }

    // restrict the supported filterjoin queries
    for (var j = 0; j < relations.length; j++) {
      if (relations[j].length !== 1) {
        throw new Error('Only one join is currently supported');
      }
    }

    var query = [];
    _sequenceJoins(query, focus, relations, filters, indexes);
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

function _assertRelation(relation) {
  if (relation.length !== 2) {
    throw new Error('Expected relation entry with 2 elements: got ' + relation);
  }
}

/**
 * Create the filterjoin from the sequence of relations
 */
function _sequenceJoins(query, focus, relations, filters, indexes) {
  var curQuery = query;
  var curFocus = focus;

  for (var i = relations.length - 1; i >= 0; i--) {
    var relation = relations[i][0];
    var dotFocus = curFocus + '.';

    _assertRelation(relation);

    var ind = _getFocusedRelationIndex(dotFocus, relation);
    if (ind !== -1) {
      var targetRel = relation[ind === 0 ? 1 : 0];
      curQuery = _addFilterJoin(curQuery, relation[ind], targetRel, indexes);
      curFocus = targetRel.substr(0, targetRel.indexOf('.'));
      _addFilters(curQuery, curFocus, filters[i]);
    } else {
      throw new Error('Expected index [' + curFocus + '] in relation ' + JSON.stringify(relation, null, ' '));
    }
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

  _addFilters(query, focus, filters);
  for (var i = 0; i < relations.length; i++) {
    _assertRelation(relations[i]);
    var ind = _getFocusedRelationIndex(dotFocus, relations[i]);
    if (ind !== -1) {
      var targetInd = ind === 0 ? 1 : 0;
      var targetRel = relations[i][targetInd];
      var targetIndex = targetRel.substr(0, targetRel.indexOf('.'));
      if (!visitedIndices.hasOwnProperty(targetIndex)) {
        var childFilters = _addFilterJoin(query, relations[i][ind], targetRel, indexes);
        _process(childFilters, targetIndex, relations, filters, indexes, visitedIndices);
      }
    }
  }
}

/**
 * Adds a filterjoin filter to the given query, from the source index to the target index
 */
function _addFilterJoin(query, source, target, indexes) {
  var sourceDot = source.indexOf('.');
  if (sourceDot === -1) {
    throw new Error('Missing dot in [' + source + ']');
  }
  var sourceIndex = source.substr(0, sourceDot);
  var sourcePath = source.substr(sourceDot + 1);

  var targetDot = target.indexOf('.');
  if (targetDot === -1) {
    throw new Error('Missing dot in [' + target + ']');
  }
  var targetIndex = target.substr(0, targetDot);
  var targetPath = target.substr(targetDot + 1);

  var types = [];
  var orderBy;
  var maxTermsPerShard;
  for (var i = 0; i < indexes.length; i++) {
    if (indexes[i].id === targetIndex) {
      if (indexes[i].type) {
        types.push(indexes[i].type);
      }
      orderBy = indexes[i].orderBy;
      maxTermsPerShard = indexes[i].maxTermsPerShard;
      break;
    }
  }

  var filterJoin = {
    indices: [targetIndex],
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
function _addFilters(query, focus, filters) {
  if (filters.hasOwnProperty(focus)) {
    var focusFilters = filters[focus];
    if (focusFilters.constructor !== Array) {
      throw new Error('The filter for the index=[' + focus + '] must be an array');
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
}
