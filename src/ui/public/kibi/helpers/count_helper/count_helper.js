define(function (require) {

  var _ = require('lodash');
  var uniqFilters = require('ui/filter_bar/lib/uniqFilters');
  var replaceOrAddJoinSetFilter   = require('ui/kibi/helpers/join_filter_helper/lib/replace_or_add_join_set_filter');

  return function CountHelperFactory(Private, Promise, timefilter, savedSearches, savedDashboards) {

    var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
    var kibiTimeHelper   = Private(require('ui/kibi/helpers/kibi_time_helper'));
    var joinFilterHelper = Private(require('ui/kibi/helpers/join_filter_helper/join_filter_helper'));
    var urlHelper        = Private(require('ui/kibi/helpers/url_helper'));

    function CountHelper() {
    }

    /*
     * returns a Promise which resolves to count query definition is a form
     * {
     *   query:
     *   indexPatternId:
     * }
     */

    CountHelper.prototype.getCountQueryForDashboardId = function (dashboardId) {
      var self = this;

      return urlHelper.getDashboardAndSavedSearchMetas([ dashboardId ])
      .then(function ([ { savedDash, savedSearchMeta } ]) {
        // now construct the query
        if (joinFilterHelper.isRelationalPanelEnabled() && joinFilterHelper.isSirenJoinPluginInstalled()) {

          var promises = [
            joinFilterHelper.getJoinFilter(dashboardId),
            urlHelper.getQueriesFromDashboardsWithSameIndex(dashboardId),
            urlHelper.getFiltersFromDashboardsWithSameIndex(dashboardId)
          ];
          return Promise.all(promises).then(function (results) {
            var joinFilter = results[0];
            var queriesFromDashboardsWithSameIndex = results[1] || [];
            var filtersFromDashboardsWithSameIndex = results[2] || [];
            return self.constructCountQuery(
              savedDash,
              savedSearchMeta,
              joinFilter,
              queriesFromDashboardsWithSameIndex,
              filtersFromDashboardsWithSameIndex
            ).then(function (query) {
              return {
                query: query,
                indexPatternId: savedSearchMeta.index
              };
            });
          });

        } else if (!joinFilterHelper.isRelationalPanelEnabled() && joinFilterHelper.isSirenJoinPluginInstalled()) {
          // get the join filter if present on the dashboard
          // add it only for the dashboard where focus match
          var joinFilter = urlHelper.getJoinFilter();
          return self.constructCountQuery(
            savedDash,
            savedSearchMeta,
            (joinFilter && joinFilter.join_set.focus === savedSearchMeta.index) ? joinFilter : null
          )
          .then(function (query) {
            return {
              query: query,
              indexPatternId: savedSearchMeta.index
            };
          });

        } else if (!joinFilterHelper.isRelationalPanelEnabled() && !joinFilterHelper.isSirenJoinPluginInstalled()) {

          return self.constructCountQuery(
            savedDash,
            savedSearchMeta,
            null
          )
          .then(function (query) {
            return {
              query: query,
              indexPatternId: savedSearchMeta.index
            };
          });

        } else if (joinFilterHelper.isRelationalPanelEnabled() && !joinFilterHelper.isSirenJoinPluginInstalled()) {

          var error = new Error('The SIREn Join plugin is enabled but not installed. ' +
            'Please install the plugin and restart Kibi, ' +
            'or disable the relational panel in Settings -> Advanced -> kibi:relationalPanel');
          return Promise.reject(error);
        }
      });
    };

    /*
     * The parameter savedSearch should be a reference to a SavedSearch
     * instance, not a SavedSearch id
     */
    CountHelper.prototype.constructCountQuery = function (savedDash, savedSearchMeta, joinSetFilter, extraQueries, extraFilters) {
      var query = {
        size: 0, // we do not need hits just a count
        query: {
          bool: {
            must: {
              match_all: {}
            },
            must_not: [],
            filter: {
              bool: {
                must: []
              }
            }
          }
        }
      };

      //update the filters
      var filters = kibiStateHelper.getFiltersForDashboardId(savedDash.id) || [];

      // if there are any filters in savedSearch add them
      if (savedSearchMeta.filter) {
        filters = filters.concat(savedSearchMeta.filter);
      }

      // any extra filters
      if (extraFilters instanceof Array) {
        filters = filters.concat(extraFilters);
      }

      // here we have to make sure that there are no duplicates
      filters = uniqFilters(filters);

      if (filters) {
        _.each(filters, function (filter) {

          if (filter.meta && filter.meta.disabled === true) {
            return;  // this return does not break is like continue
          }

          if (filter.meta && filter.meta.negate === true) {

            if (filter.query) {
              query.query.bool.must_not.push({query: filter.query});
            } else if (filter.dbfilter) {
              query.query.bool.must_not.push({dbfilter: filter.dbfilter});
            } else if (filter.or) {
              query.query.bool.must_not.push({or: filter.or});
            } else if (filter.exists) {
              query.query.bool.must_not.push({exists: filter.exists});
            } else if (filter.geo_bounding_box) {
              query.query.bool.must_not.push({geo_bounding_box: filter.geo_bounding_box});
            } else if (filter.missing) {
              query.query.bool.must_not.push({missing: filter.missing});
            } else if (filter.range) {
              query.query.bool.must_not.push({range: filter.range});
            } else if (filter.script) {
              query.query.bool.must_not.push({script: filter.script});
            } else if (filter.join_set) {
              query.query.bool.must_not.push({join_set: filter.join_set});
            } else if (filter.join_sequence) {
              query.query.bool.must_not.push({join_sequence: filter.join_sequence});
            }
          } else {

            if (filter.query && !kibiStateHelper.isAnalyzedWildcardQueryString(filter.query)) {
              // here add only if not "match *" as it would not add anything to the query anyway
              query.query.bool.filter.bool.must.push({query: filter.query});
            } else if (filter.dbfilter) {
              query.query.bool.filter.bool.must.push({dbfilter: filter.dbfilter});
            } else if (filter.or) {
              query.query.bool.filter.bool.must.push({or: filter.or});
            } else if (filter.exists) {
              query.query.bool.filter.bool.must.push({exists: filter.exists});
            } else if (filter.geo_bounding_box) {
              query.query.bool.filter.bool.must.push({geo_bounding_box: filter.geo_bounding_box});
            } else if (filter.missing) {
              query.query.bool.filter.bool.must.push({missing: filter.missing});
            } else if (filter.range) {
              query.query.bool.filter.bool.must.push({range: filter.range});
            } else if (filter.script) {
              query.query.bool.filter.bool.must.push({script: filter.script});
            } else if (filter.join_set) {
              query.query.bool.filter.bool.must.push({join_set: filter.join_set});
            } else if (filter.join_sequence) {
              query.query.bool.filter.bool.must.push({join_sequence: filter.join_sequence});
            }

          }

        });
      }

      var queries = [];

      // query from kibiState
      var selectedDashboardQuery = kibiStateHelper.getQueryForDashboardId(savedDash.id);
      if (selectedDashboardQuery && !kibiStateHelper.isAnalyzedWildcardQueryString(selectedDashboardQuery)) {
        queries.push({
          query: selectedDashboardQuery
        });
      }

      // query from savedSearchMeta
      if (savedSearchMeta.query && !_.isEmpty(savedSearchMeta.query) &&
          !kibiStateHelper.isAnalyzedWildcardQueryString(savedSearchMeta.query)) {
        queries.push({
          query: savedSearchMeta.query
        });
      }

      // any extra queries
      if (extraQueries instanceof Array) {
        _.each(extraQueries, function (q) {
          if (!kibiStateHelper.isAnalyzedWildcardQueryString(q)) {
            queries.push({
              query: q
            });
          }
        });
      }

      queries = uniqFilters(queries);

      _.each(queries, function (q) {
        query.query.bool.filter.bool.must.push(q);
      });

      if (joinSetFilter) {
        replaceOrAddJoinSetFilter(query.query.bool.filter.bool.must, joinSetFilter, true);
      }

      // update time filter
      return savedSearches.get(savedDash.savedSearchId).then(function (dashboardSavedSearch) {
        const timeFilter = timefilter.get(dashboardSavedSearch.searchSource._state.index);
        if (timeFilter) {

          return kibiTimeHelper.updateTimeFilterForDashboard(savedDash.id, timeFilter)
          .then(function (updatedTimeFilter) {
            query.query.bool.filter.bool.must.push(updatedTimeFilter);
            return query;
          });

        } else {
          return query;
        }
      });
    };

    return new CountHelper();
  };
});
