import _ from 'lodash';
import { highlightTags } from './highlight_tags';
// kibi: importing query helpers
import { DecorateQueryProvider } from 'src/ui/public/courier/data_source/_decorate_query';
import { uniqFilters } from 'src/ui/public/filter_bar/lib/uniq_filters';
//kibi: end
let getHighlightQuery;
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
    // kibi: if array, dedupe the filters after mapping over and getting highlight_queries.
    query[clauses] = uniqFilters(_(query[clauses]).map(getHighlightQuery).compact().value());
  } else {
    query[clauses] = getHighlightQuery(query[clauses]) || [];
  }
}
// kibi: end

/**
  * Returns a clone of the query with `"all_fields": true` set on any `query_string` queries
  * If it is a wildcard query e.g. "query": "*", convert to a "match_all": {} query
  */
function highlightQueryParser(decorateQuery) {
  // kibi: do not include join queries into the highlight query
  // kibi: use curried function to allow passing of decorateQuery
  return function (query) {
    if (query.join_sequence) {
      return;
    }
    let clone = _.cloneDeep(query);

    // kibi: assign query_string options from config to default wildcard query
    // before comparing to query in request
    const defaultQuery = decorateQuery({ query_string: { query: '*' } });

    if (_.isEqual(clone, defaultQuery)) {
      clone = Object.assign({ match_all: {} });
    } else if (
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
  };
}

export function getHighlightRequestProvider(config) {
  // kibi: Need to instantiate decorateQuery here and pass it into highlight functions
  const decorateQuery = new DecorateQueryProvider(config);
  getHighlightQuery = highlightQueryParser(decorateQuery);

  return function getHighlightRequest(query) {
    if (!config.get('doc_table:highlight')) return;

    const fieldsParams = config.get('doc_table:highlight:all_fields')
      ? { highlight_query: getHighlightQuery(query, decorateQuery) }
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
