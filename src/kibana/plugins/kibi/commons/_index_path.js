define(function (require) {
  return function (Private) {
    var patternToWildcard = Private(require('components/index_patterns/_pattern_to_wildcard'));

    return function (indexOrIndexPattern) {
      if (indexOrIndexPattern.indexOf('*') !== -1) {
        return indexOrIndexPattern;
      }
      var toWildcard = patternToWildcard(indexOrIndexPattern);
      if (toWildcard === '*') {
        return indexOrIndexPattern;
      }
      return toWildcard;
    };
  };
});
