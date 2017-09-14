/**
 * Returns the body of a search that does not match anything.
 */
export function emptySearch() {
  return {
    query: {
      match_none: {}
    }
  };
}
