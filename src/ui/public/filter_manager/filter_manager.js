// Adds a filter to a passed state
define(function (require) {
  return function (Private) {
    let _ = require('lodash');
    let queryFilter = Private(require('ui/filter_bar/query_filter'));
    let filterManager = {};

    filterManager.add = function (field, values, operation, index) {
      values = _.isArray(values) ? values : [values];
      let fieldName = _.isObject(field) ? field.name : field;
      let filters = _.flatten([queryFilter.getAppFilters()]);
      let newFilters = [];

      let negate = (operation === '-');

      // TODO: On array fields, negating does not negate the combination, rather all terms
      _.each(values, function (value) {
        let filter;
        let existing = _.find(filters, function (filter) {
          if (!filter) return;

          if (fieldName === '_exists_' && filter.exists) {
            return filter.exists.field === value;
          }

          // kibi: added "&& filter.query.match "because clicking on a cell of the data table
          // with a filter aggregation creates a filter with query_string
          if (filter.query && filter.query.match) {
            return filter.query.match[fieldName] && filter.query.match[fieldName].query === value;
          }

          if (filter.script) {
            return filter.meta.field === fieldName && filter.script.params.value === value;
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
          case '_exists_':
            filter = {
              meta: {
                negate: negate,
                index: index
              },
              exists: {
                field: value
              }
            };
            break;
          default:
            if (field.scripted) {
              filter = {
                meta: { negate: negate, index: index, field: fieldName },
                script: {
                  script: '(' + field.script + ') == value',
                  lang: field.lang,
                  params: {
                    value: value
                  }
                }
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
              filter = { meta: { negate: negate, index: index }, query: { match: {} } };
              filter.query.match[fieldName] = { query: value, type: 'phrase' };
            }

            break;
        }

        newFilters.push(filter);
      });

      return queryFilter.addFilters(newFilters);
    };

    return filterManager;
  };
});
