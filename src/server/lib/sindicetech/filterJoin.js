var util = require('./util');

/**
 * Generate a relational query based on the given relations with the focused index as the root of the query
 * focus: the focused index as a string
 * relations: the relation graph of indices as an array of arrays, each array being an edge between two indices
 * filters: the filters for each index as an object, which entries are the index names
 */
module.exports = function (json) {
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
      throw new Error('Missing focus field in the join object: ' + data);
    }
    if (indexes === undefined) {
      throw new Error('Missing indexes field in the join object: ' + data);
    }
    if (relations === undefined) {
      relations = [];
    }
    if (filters === undefined) {
      filters = {};
    }

    var query = [];
    _process(query, focus, relations, filters, indexes, {});
    return query;
  });
  for (var i = 0; i < objects.length; i++) {
    var path = objects[i].path;
    if (util.length(json, path) !== 1) {
      throw new Error('The object at ' + JSON.stringify(path, null, ' ') + ' must only contain the join filter');
    }
    util.delete(json, path.slice(0, path.length - 1), path[path.length - 1]);
    util.addAll(json, path.slice(0, path.length - 1), objects[i].value);
  }
  return json;
};

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
    if (relations[i].length !== 2) {
      throw new Error('Expected relation entry with 2 elements: got ' + relations[i]);
    }
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

  var type = '';
  var orderBy;
  var maxTermsPerShard;
  for (var i = 0; i < indexes.length; i++) {
    if (indexes[i].id === targetIndex) {
      type = indexes[i].type;
      orderBy = indexes[i].orderBy;
      maxTermsPerShard = indexes[i].maxTermsPerShard;
      break;
    }
  }
  if (!type) {
    throw new Error('Type of index [' + targetIndex + '] was not found');
  }

  var filterJoin = {
    index: targetIndex,
    type: type,
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
    query.push(fjObject);
  } else {
    // this is a nested filter join
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
