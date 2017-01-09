define(function (require) {
  return function (Private) {
    const patternToWildcard = Private(require('ui/index_patterns/_pattern_to_wildcard'));

    return function (indexOrIndexPattern) {
      if (indexOrIndexPattern.indexOf('*') !== -1) {
        return indexOrIndexPattern;
      }
      const toWildcard = patternToWildcard(indexOrIndexPattern);
      if (toWildcard === '*') {
        return indexOrIndexPattern;
      }
      return toWildcard;
    };
  };
});
