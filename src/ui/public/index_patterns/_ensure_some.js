export function EnsureSomeIndexPatternsFn(kbnUrl) {
  return function ensureSomeIndexPatterns() {
    return function promiseHandler(patterns) {
      if (!patterns || patterns.length === 0) {
        kbnUrl.redirectPath('/management/siren/index'); // kibi: changed path from /management/kibana/index to /management/siren/index
      }

      return patterns;
    };
  };
}
