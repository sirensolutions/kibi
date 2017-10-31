import _ from 'lodash';
import { FilterBarQueryFilterProvider } from 'ui/filter_bar/query_filter';
import { getPhraseScript } from './lib/phrase';

// Adds a filter to a passed state
export function FilterManagerProvider(Private) {
  const queryFilter = Private(FilterBarQueryFilterProvider);
  const filterManager = {};

  // kibi: here additional parameter options was needed for more_like_this filter
  filterManager.add = function (field, values, operation, index, options) {
    values = _.isArray(values) ? values : [values];
    const fieldName = _.isObject(field) ? field.name : field;
    const filters = _.flatten([queryFilter.getAppFilters()]);
    const newFilters = [];

    const negate = (operation === '-');

    // TODO: On array fields, negating does not negate the combination, rather all terms
    _.each(values, function (value) {
      let filter;
      const existing = _.find(filters, function (filter) {
        if (!filter) return;

        if (fieldName === '_exists_' && filter.exists) {
          return filter.exists.field === value;
        }

        if (_.has(filter, 'query.match')) {
          return filter.query.match[fieldName] && filter.query.match[fieldName].query === value;
        }

        if (filter.script) {
          return filter.meta.field === fieldName && filter.script.script.params.value === value;
        }

        // kibi: added because filter with null value and exists query
        if (filter.query && value === null) {
          return true;
        }
      });

      if (existing) {
        existing.meta.disabled = false;
        if (existing.meta.negate !== negate) {
          queryFilter.invertFilter(existing);
        }
        return;
      }

      switch (fieldName) {
        case '_more_like_this_':
          let truncatedFirstValue = values[0];
          if (truncatedFirstValue.length > 10) {
            truncatedFirstValue = truncatedFirstValue.substring(0, 10) + ' ...';
          }

          filter = {
            meta: {
              alias: 'More like this: ' + truncatedFirstValue,
              negate,
              index
            },
            query: {
              more_like_this: {
                fields: [ options.fieldName ],
                like: values
              }
            }
          };
          if (options.moreLikeThisTemplate) {
            _.each(options.moreLikeThisTemplate, (value, key) => {
              if (value) {
                filter.query.more_like_this[key] = value;
              }
            });
          }
          break;
        case '_exists_':
          filter = {
            meta: { negate, index },
            exists: {
              field: value
            }
          };
          break;
        default:
          if (field.scripted) {
            filter = {
              meta: { negate, index, field: fieldName },
              script: getPhraseScript(field, value)
            };
          }
          // kibi: added because clicking on a cell of the data table with a null value
          else if (value === null) {
            filter = {
              meta: {
                negate,
                index
              },
              query: {
                bool: {
                  must_not: {
                    exists: {
                      field: field.displayName
                    }
                  }
                }
              }
            };
          } else {
            filter = { meta: { negate, index }, query: { match: {} } };
            filter.query.match[fieldName] = { query: value, type: 'phrase' };
          }

          break;
      }

      newFilters.push(filter);
    });

    return queryFilter.addFilters(newFilters);
  };

  return filterManager;
}
