define(function (require) {

  var _ = require('lodash');
  var uniqFilters = require('components/filter_bar/lib/uniqFilters');
  var replace_or_add_join_filter   = require('components/sindicetech/join_filter_helper/lib/replace_or_add_join_filter');
  var getSavedSearchMeta =  require('components/kibi/count_helper/lib/get_saved_search_meta');

  return function CountHelperFactory(Private, Promise, timefilter, indexPatterns, savedSearches, savedDashboards) {

    var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
    var kibiTimeHelper   = Private(require('components/kibi/kibi_time_helper/kibi_time_helper'));
    var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
    var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));

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

      return new Promise(function (fulfill, reject) {
        savedDashboards.get(dashboardId).then(function (dashboard) {
          if (!dashboard.id) {
            return Promise.reject(new Error('Dashboard must have an id'));
          }
          if (!dashboard.savedSearchId || dashboard.savedSearchId === '') {
            return Promise.reject(new Error('For computing counts dashboard must have savedSearchId'));
          }

          savedSearches.get(dashboard.savedSearchId).then(function (savedSearch) {

            // now construct the query
            var extraFilters = [];
            if (joinFilterHelper.isFilterJoinPluginEnabled() && joinFilterHelper.isFilterJoinPluginInstalled()) {

              joinFilterHelper.getJoinFilter(dashboard.id).then(function (joinFilter) {
                self.constructCountQuery(dashboard.id, savedSearch, extraFilters, joinFilter)
                .then(function (query) {
                  fulfill({
                    query: query,
                    indexPatternId: savedSearch.searchSource._state.index.id
                  });
                });
              }).catch(function (err) {
                // we could not get joinFilter
                // there could be multiple reasons - most of them is missconfiguration
                // for now let just login the reason
                if (console) {
                  console.log(err);
                }
                self.constructCountQuery(dashboard.id, savedSearch, extraFilters, null)
                .then(function (query) {
                  fulfill({
                    query: query,
                    indexPatternId: savedSearch.searchSource._state.index.id
                  });
                });
              });

            } else if (!joinFilterHelper.isFilterJoinPluginEnabled() && joinFilterHelper.isFilterJoinPluginInstalled()) {
              // get the join filter if present on the dashboard
              var joinFilter = urlHelper.getJoinFilter();
              // add it only for the dashboard where focus match
              if (joinFilter && joinFilter.join.focus === savedSearch.searchSource._state.index.id) {
                extraFilters.push(joinFilter);
              }

              self.constructCountQuery(dashboard.id, savedSearch, extraFilters, null)
              .then(function (query) {
                fulfill({
                  query: query,
                  indexPatternId: savedSearch.searchSource._state.index.id
                });
              });

            } else if (!joinFilterHelper.isFilterJoinPluginEnabled() && !joinFilterHelper.isFilterJoinPluginInstalled()) {

              self.constructCountQuery(dashboard.id, savedSearch, [], null)
              .then(function (query) {
                fulfill({
                  query: query,
                  indexPatternId: savedSearch.searchSource._state.index.id
                });
              });

            } else if (joinFilterHelper.isFilterJoinPluginEnabled() && !joinFilterHelper.isFilterJoinPluginInstalled()) {

              var error = new Error(
                'The FilterJoin plugin is enabled but not installed. ' +
                'Please install the plugin and restart Kibi ' +
                'or disable the relationalPanel in Settings -> Advanced -> kibi:relationalPanelConfig'
              );
              reject(error);
            }
          })
          .catch(function (err) {
            reject(err);
          });
        })
        .catch(function (err) {
          reject(err);
        });
      });
    };

    /*
     * The parameter savedSearch should be a reference to a SavedSearch
     * instance, not a SavedSearch id
     */
    CountHelper.prototype.constructCountQuery = function (dashboardId, savedSearch, extraFilters, joinFilter) {
      return new Promise(function (fulfill, reject) {

        var indexPattern = savedSearch.searchSource._state.index;

        var query = {
          size: 0, // we do not need hits just a count
          query: {
            filtered: {
              query: {
                match_all: {}
              },
              filter: {
                bool: {
                  must: [],
                  must_not: []
                }
              }
            }
          }
        };

        //update the filters
        var selectedDashboardFilters = kibiStateHelper.getFiltersForDashboardId(dashboardId);

        // add extra filters if any
        if (extraFilters) {
          if (!selectedDashboardFilters) {
            selectedDashboardFilters = extraFilters;
          } else if (extraFilters.length === 1 && extraFilters[0].join) {
            // remove any other join filter from filters
            selectedDashboardFilters = _.filter(selectedDashboardFilters, function (f) {
              return !f.join;
            });
          }
        }

        // if there are any filters in savedSearch add them
        var savedSearchMeta = getSavedSearchMeta(savedSearch);
        if (savedSearchMeta.filter) {
          selectedDashboardFilters = selectedDashboardFilters.concat(savedSearchMeta.filter);
        }

        // here we have to make sure that there are no duplicates
        selectedDashboardFilters = uniqFilters(selectedDashboardFilters.concat(extraFilters));

        if (selectedDashboardFilters) {
          _.each(selectedDashboardFilters, function (filter) {

            if (filter.meta && filter.meta.disabled === true) {
              return;  // this return does not break is like continue
            }

            if (filter.meta && filter.meta.negate === true) {

              if (filter.query) {
                query.query.filtered.filter.bool.must_not.push({query: filter.query});
              } else if (filter.or) {
                query.query.filtered.filter.bool.must_not.push({or: filter.or});
              } else if (filter.dbfilter) {
                query.query.filtered.filter.bool.must_not.push({dbfilter: filter.dbfilter});
              } else if (filter.exists) {
                query.query.filtered.filter.bool.must_not.push({exists: filter.exists});
              } else if (filter.geo_bounding_box) {
                query.query.filtered.filter.bool.must_not.push({geo_bounding_box: filter.geo_bounding_box});
              } else if (filter.missing) {
                query.query.filtered.filter.bool.must_not.push({missing: filter.missing});
              } else if (filter.range) {
                query.query.filtered.filter.bool.must_not.push({range: filter.range});
              } else if (filter.script) {
                query.query.filtered.filter.bool.must_not.push({script: filter.script});
              } else if (filter.join) {
                query.query.filtered.filter.bool.must_not.push({join: filter.join});
              }
            } else {

              if (filter.query &&
                  !(
                     filter.query.query_string &&
                     filter.query.query_string.query === '*' &&
                     filter.query.query_string.analyze_wildcard === true
                  )
              ) {
                // here add only if not "match *" as it would not add anything to the query anyway
                query.query.filtered.filter.bool.must.push({query: filter.query});
              } else if (filter.or) {
                query.query.filtered.filter.bool.must.push({or: filter.or});
              } else if (filter.dbfilter) {
                query.query.filtered.filter.bool.must.push({dbfilter: filter.dbfilter});
              } else if (filter.exists) {
                query.query.filtered.filter.bool.must.push({exists: filter.exists});
              } else if (filter.geo_bounding_box) {
                query.query.filtered.filter.bool.must.push({geo_bounding_box: filter.geo_bounding_box});
              } else if (filter.missing) {
                query.query.filtered.filter.bool.must.push({missing: filter.missing});
              } else if (filter.range) {
                query.query.filtered.filter.bool.must.push({range: filter.range});
              } else if (filter.script) {
                query.query.filtered.filter.bool.must.push({script: filter.script});
              } else if (filter.join) {
                query.query.filtered.filter.bool.must.push({join: filter.join});
              }

            }

          });
        }

        //update the query
        var selectedDashboardQuery = kibiStateHelper.getQueryForDashboardId(dashboardId);
        if (selectedDashboardQuery &&
           !(
              selectedDashboardQuery.query_string &&
              selectedDashboardQuery.query_string.query === '*' &&
              selectedDashboardQuery.query_string.analyze_wildcard === true
            )
        ) {

          query.query.filtered.filter.bool.must.push({
            query: selectedDashboardQuery
          });
        }

        if (savedSearchMeta.query && !_.isEmpty(savedSearchMeta.query) &&
           !(
              savedSearchMeta.query.query_string &&
              savedSearchMeta.query.query_string.query === '*'  &&
              savedSearchMeta.query.query_string.analyze_wildcard === true
            )
        ) {
          query.query.filtered.filter.bool.must.push({
            query: savedSearchMeta.query
          });
        }


        if (joinFilter) {
          replace_or_add_join_filter(query.query.filtered.filter.bool.must, joinFilter, true);
        }

        // update time filter
        var timeFilter = timefilter.get(indexPattern);
        if (timeFilter) {

          kibiTimeHelper.updateTimeFilterForDashboard(dashboardId, timeFilter)
          .then(function (updatedTimeFilter) {
            query.query.filtered.filter.bool.must.push(updatedTimeFilter);
            fulfill(query);
          }).catch(function (err) {
            reject(err);
          });

        } else {
          fulfill(query);
        }
      });
    };

    return new CountHelper();
  };
});
