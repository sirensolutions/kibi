import _ from 'lodash';
import highlightTags from './highlight_tags';

const FRAGMENT_SIZE = Math.pow(2, 31) - 1; // Max allowed value for fragment_size (limit of a java int)

// kibi: added _walkHighlightClauses function
/**
 * Removes join sequences and sets from a query.
 *
 * @param {Object} query - The query to modify.
 * @param {String} clauses - The name of the list of clauses (e.g. must or must_not).
 * @private
 */
function _walkHighlightClauses(query, clauses) {
  if (!query[clauses]) {
    return;
  }
  if (Array.isArray(query[clauses])) {
    query[clauses] = _(query[clauses]).map(getHighlightQuery).compact().value();
  } else {
    query[clauses] = getHighlightQuery(query[clauses]) || [];
  }
}
// kibi: end

/**
  * Returns a clone of the query with `"all_fields": true` set on any `query_string` queries
  */
function getHighlightQuery(query) {
  // kibi: do not include join queries into the highlight query
  if (query.join_sequence || query.join_set) {
    return;
  }

  const clone = _.cloneDeep(query);

  if (
    _.has(clone, 'query_string')
    && !_.has(clone, ['query_string', 'default_field'])
    && !_.has(clone, ['query_string', 'fields'])
  ) {
    clone.query_string.all_fields = true;
  }
  // kibi: check must and must_not
  else if (clone.bool) {
    _walkHighlightClauses(clone.bool, 'must');
    _walkHighlightClauses(clone.bool, 'must_not');
  }
  // kibi: end

  return clone;
}

export default function getHighlightRequestProvider(config) {
  return function getHighlightRequest(query) {
    if (!config.get('doc_table:highlight')) return;

    const fieldsParams = config.get('doc_table:highlight:all_fields')
      ? { highlight_query: getHighlightQuery(query) }
      : {};

    return {
      pre_tags: [highlightTags.pre],
      post_tags: [highlightTags.post],
      fields: {
        '*': fieldsParams
      },
      fragment_size: FRAGMENT_SIZE
    };
  };
}
