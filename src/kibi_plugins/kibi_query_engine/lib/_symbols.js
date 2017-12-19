const SELECTED_DOCUMENT_NEEDED = Symbol.for('selected document needed');
const QUERY_RELEVANT = Symbol.for('query is relevant');
const QUERY_DEACTIVATED = Symbol.for('query should be deactivated');

module.exports = {
  SELECTED_DOCUMENT_NEEDED,
  QUERY_RELEVANT,
  QUERY_DEACTIVATED
};
