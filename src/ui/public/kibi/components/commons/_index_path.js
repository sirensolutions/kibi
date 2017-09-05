import { PatternToWildcardFn } from './_pattern_to_wildcard';

export function IndexPathProvider(Private) {
  const patternToWildcard = Private(PatternToWildcardFn);

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
