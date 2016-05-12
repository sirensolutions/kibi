define(function (require) {
  /**
   * Returns true if the path matches the given pattern
   */
  function matchPath(pathPattern, path) {
    var pattern = pathPattern.split('.');
    var pathArr = path.split('.');

    if (pattern.length !== pathArr.length) {
      return false;
    }
    for (var i = 0; i < pattern.length; i++) {
      if (pattern[i] !== '*' && pattern[i] !== pathArr[i]) {
        return false;
      }
    }
    return true;
  }

  function process(val, name) {
    if (val.constructor === Array) {
      for (var i = 0; i < val.length; i++) {
        if (matchPath(val[i], name)) {
          return true;
        }
      }
      return false;
    } else {
      return matchPath(val, name);
    }
  }

  function addVisTypes(retArray, sourceFiltering, type, name) {
    // first process all if present
    for (var visType in sourceFiltering) {
      if (sourceFiltering.hasOwnProperty(visType)) {
        var conf = sourceFiltering[visType];
        if (conf[type] && process(conf[type], name) && retArray.indexOf(visType) === -1) {
          retArray.push(visType);
          continue;
        }
      }
    }
  }
  /**
   * Returns true if the field named "name" should be retrieved as part of
   * the _source object for each hit.
   */
  return function fieldExcludedFor(sourceFiltering, name) {
    var excluded = [];
    var included = [];
    if (sourceFiltering) {
      addVisTypes(excluded, sourceFiltering, 'exclude', name);
    }
    if (sourceFiltering) {
      addVisTypes(included, sourceFiltering, 'include', name);
    }
    // remove all explicitelly included from excluded array
    for (var i = excluded.length - 1; i > 0; i--) {
      var excl = excluded[i];
      if (included.indexOf() !== -1) {
        delete excluded[i];
      }
    }
    return excluded;
  };
});
