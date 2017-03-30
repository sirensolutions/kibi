import PatternToWildcardProvider from 'ui/index_patterns/_pattern_to_wildcard';

export default function (Private) {
  const patternToWildcard = Private(PatternToWildcardProvider);

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
