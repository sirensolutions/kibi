import _ from 'lodash';
import Promise from 'bluebird';
import kibiUtils from 'kibiutils';

// The string used for separating the componements of a JSON path
const PATH_SEPARATOR = '!"£$%^&*_+';

/**
 * Traverse the JSON object and modify each label nested objects with the
 * output of the apply callback.
 */
exports.traverse = function (json, label, apply) {
  return _traverse0(json, [], label, apply, []);
};

/**
 * Traverse the JSON object and collect the promises for modifying that object
 */
function _traverse0(json, objects, label, apply, curPath) {
  // visit each attribute
  for (const attribute in json) {
    if (json.hasOwnProperty(attribute)) {
      if (attribute === label) {
        // attribute to modify is found
        if (json[attribute] === null || typeof (json[attribute]) !== 'object') {
          apply(new Error(`Unexpected value for [${label}]. Got ${json[attribute]} of type [${typeof (json[attribute])}]`), null);
        } else {
          objects.push({
            path: Array.from(curPath),
            value: apply(null, json[attribute])
          });
        }
      }
      // Go down to the nested object
      if (json[attribute] !== null && typeof (json[attribute]) === 'object') {
        _traverse0(json[attribute], objects, label, apply, [ ...curPath, attribute ]);
      }
    }
  }
  return objects;
}


/**
 * Replace the label object at the given path in json with the given object
 */
exports.replace = function (json, path, oldLabel, newLabel, object) {
  kibiUtils.goToElement(json, path, function (json) {
    _delete(json, oldLabel);
    if (json.constructor === Array) {
      let offset = parseInt(newLabel, 10);
      if (object.constructor === Array) {
        // merge the two arrays
        for (let j = 0; j < object.length; j++) {
          json.splice(offset, 0, object[j]);
          offset++;
        }
      } else {
        json.splice(offset, 0, object);
      }
    } else {
      json[newLabel] = object;
    }
  });
};

/**
 * Insert all the elements of the object at the given path in json
 */
exports.insert = function (json, path, object) {
  kibiUtils.goToElement(json, path, function (json) {
    for (const att in object) {
      if (object.hasOwnProperty(att)) {
        json[att] = object[att];
      }
    }
  });
};

/**
 * Returns the size of the element at the given path.
 */
exports.length = function (json, path) {
  let len = 0;

  kibiUtils.goToElement(json, path, function (json) {
    for (const att in json) {
      if (json.hasOwnProperty(att)) {
        len++;
      }
    }
  });
  return len;
};

function _delete(json, label) {
  if (json.constructor === Object) {
    delete json[label];
  } else if (json.constructor === Array) {
    json.splice(parseInt(label, 10), 1);
  } else {
    throw new Error('Unable to delete element ' + label + ' in ' + JSON.stringify(json, null, ' '));
  }
}

/**
 * Delete deletes the label entry at the given path in json
 */
exports.delete = function (json, path, label) {
  kibiUtils.goToElement(json, path, function (json) {
    _delete(json, label);
  });
};

/**
 * GetQueriesAsPromise returs an array of promises, which elements are the queries
 * contained in the given body, one per line.
 */
exports.getQueriesAsPromise = function (body) {
  const process = function (body, start, end) {
    const query = JSON.parse(body.toString(null, start, end));
    return Promise.resolve(query);
  };
  return Promise.all(_getQueries(body, process));
};

/**
 * GetQueries returs an array of queries that were
 * contained in the given body, one per line.
 */
exports.getQueries = function (body) {
  const process = function (body, start, end) {
    const query = JSON.parse(body.toString(null, start, end));
    return query;
  };
  return _getQueries(body, process);
};

function _getQueries(body, process) {
  let start = 0;
  const promisedQueries = [];

  // for each query in the body
  for (let i = 0; i < body.length; i++) {
    // 10 is a newline char point
    if (body[i] === 10) {
      promisedQueries.push(process(body, start, i));
      start = i + 1;
    } else if (i + 1 === body.length) {
      // process the last query
      promisedQueries.push(process(body, start, body.length));
    }
  }
  return promisedQueries;
}
