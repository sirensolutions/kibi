define(function (require) {
  return function JoinFilterHelperFactory(config, configFile, Private, savedDashboards, savedSearches, Promise) {
    var _ = require('lodash');
    var replace_or_add_join_filter   = require('components/sindicetech/join_filter_helper/lib/replace_or_add_join_filter');

    var queryHelper = Private(require('components/sindicetech/query_helper/query_helper'));
    var urlHelper   = Private(require('components/sindicetech/urlHelper/urlHelper'));

    var _isIndexInEnabledRelations = function (indexId, enabledRelations) {
      for (var i = 0; i < enabledRelations.length; i++) {
        var enabledRelation = enabledRelations[i];
        if (enabledRelation[0].indexOf(indexId) === 0 || enabledRelation[1].indexOf(indexId) === 0) {
          return true;
        }
      }
      return false;
    };

    function JoinFilterHelper() {}

    JoinFilterHelper.prototype.getJoinFilter = function (focusDashboardId) {
      return new Promise(function (fulfill, reject) {
        var relationalPanelConfig = config.get('kibi:relationalPanelConfig');
        if (focusDashboardId) {
          savedDashboards.get(focusDashboardId).then(function (dashboard) {
            if (dashboard.savedSearchId) {

              // get savedSearch to access the index
              savedSearches.get(dashboard.savedSearchId).then(function (dashboardSavedSearch) {

                var focusIndex = dashboardSavedSearch.searchSource._state.index.id;
                // here check that the join filter should be present on this dashboard
                // it should be added only if we find focus in enabled relations
                if (focusIndex && _isIndexInEnabledRelations(focusIndex, relationalPanelConfig.enabledRelations)) {

                  // here grab the filters per index
                  urlHelper.getRegularFiltersPerIndex().then(function (filters) {
                    // keep only the filters which are in the connected component
                    var labels = queryHelper.getLabelsInConnectedComponent(focusIndex, relationalPanelConfig.enabledRelations);
                    for (var filter in filters) {
                      if (filters.hasOwnProperty(filter) && !_.contains(labels, filter)) {
                        delete filters[filter];
                      }
                    }
                    urlHelper.getQueriesPerIndex().then(function (queries) {

                      queryHelper.constructJoinFilter(
                        focusIndex,
                        relationalPanelConfig.indexes,
                        relationalPanelConfig.enabledRelations,
                        filters,
                        queries,
                        null      // here if we want the dashboard time be taken into consideration this map is necessary
                      ).then(function (joinFilter) {
                        fulfill(joinFilter);
                      }).catch(function (err) {
                        reject(err);
                      });

                    });
                  });

                } else {
                  reject(new Error('Relational filter it has no enabled relations for focus: ' +  focusIndex));
                }
              });
              // end of get saveSearch

            } else {
              reject(new Error('The focus dashbord does not have saveSearchId set'));
            }
          });
        } else {
          reject(new Error('Specify focusDashboardId'));
        }
      });
    };


    JoinFilterHelper.prototype.updateJoinFilter = function () {
      var self = this;
      return new Promise(function (fulfill, reject) {

        var currentDashboardId = urlHelper.getCurrentDashboardId();
        if (currentDashboardId) {

          self.getJoinFilter(currentDashboardId).then(function (joinFilter) {
            urlHelper.addFilter(joinFilter);
            fulfill();
          }).catch( function (error) {
            urlHelper.removeJoinFilter();
            fulfill();
          });

        } else {
          urlHelper.removeJoinFilter();
          fulfill();
        }

      });
    };


    JoinFilterHelper.prototype.replaceOrAddJoinFilter = function (filterArray, joinFilter, stripMeta) {
      return replace_or_add_join_filter(filterArray, joinFilter, stripMeta);
    };

    JoinFilterHelper.prototype.isFilterJoinPluginEnabled = function () {
      return config.get('kibi:relationalPanelConfig') && config.get('kibi:relationalPanelConfig').enabled;
    };

    JoinFilterHelper.prototype.isFilterJoinPluginInstalled = function () {
      return configFile.elasticsearch_plugins.indexOf('FilterJoinPlugin') !== -1;
    };

    return new JoinFilterHelper();
  };
});
