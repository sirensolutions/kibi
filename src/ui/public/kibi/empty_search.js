/**
 * Returns the body of a search that does not match anything.
 */
export default function emptySearch() {
  return {
    query: {
      match_none: {}
    }
  };
}
