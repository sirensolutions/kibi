define(function (require) {
  return function JoinFilterHelperFactory(config, configFile, Private, savedDashboards, savedSearches, Promise) {
    var _ = require('lodash');
    var replace_or_add_join_set_filter = require('components/sindicetech/join_filter_helper/lib/replace_or_add_join_set_filter');

    var queryHelper = Private(require('components/sindicetech/query_helper/query_helper'));
    var urlHelper   = Private(require('components/kibi/url_helper/url_helper'));


    var _invert = function (obj) {
      var new_obj = {};
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          new_obj[obj[prop]] = prop;
        }
      }
      return new_obj;
    };


    function JoinFilterHelper() {}

    JoinFilterHelper.prototype.getJoinFilter = function (focusDashboardId) {
      var self = this;
      return new Promise(function (fulfill, reject) {
        if (focusDashboardId) {
          var relations = config.get('kibi:relations').relationsDashboards;
          if (!relations) {
            reject(new Error('Could not get kibi:relations'));
          }

          var focusedSavedSearch = savedDashboards.get(focusDashboardId).then(function (dashboard) {
            // get focused dashboard
            if (!dashboard.savedSearchId) {
              reject(new Error('The focus dashboard "' + focusDashboardId + '" does not have a saveSearchId'));
            } else {
              // get savedSearch to access the index
              return savedSearches.get(dashboard.savedSearchId);
            }
          });

          // grab only enabled relations
          var enabledRelations = _.filter(relations, function (relation) {
            return relation.enabled;
          });

          // collect ids of dashboards from enabled relations
          var dashboardIds = _(enabledRelations).map(function (relation) {
            return relation.dashboards;
          }).flatten().uniq().value();

          var filtersPerIndexPromise = urlHelper.getRegularFiltersPerIndex(dashboardIds);
          var queriesPerIndexPromise = urlHelper.getQueriesPerIndex(dashboardIds);


          Promise.all([focusedSavedSearch, filtersPerIndexPromise, queriesPerIndexPromise]).then(function (data) {
            var dashboardSavedSearch = data[0];
            var filtersPerIndex = data[1];
            var queriesPerIndex = data[2];

            if (!dashboardSavedSearch) {
              reject(new Error('Not possible to get joinFilter as SavedSearch is undefined for for [' +  focusDashboardId + ']'));
              return;
            }

            var focusIndex = dashboardSavedSearch.searchSource._state.index.id;

            // here check that the join filter should be present on this dashboard
            // it should be added only if we find current dashboardId in enabled relations
            var isFocusDashboardInEnabledRelations = urlHelper.isDashboardInEnabledRelations(
              focusDashboardId, enabledRelations
            );
            if (!focusIndex) {
              reject(new Error('SavedSearch for [' +  focusDashboardId + '] dashboard seems to not have an index id'));
              return;
            }
            if (!isFocusDashboardInEnabledRelations) {
              reject(new Error('The join filter has no enabled relation for the focused dashboard : ' +  focusDashboardId));
              return;
            }


            return urlHelper.getIndexToDashboardMap(dashboardIds).then(function (indexToDashboardsMap) {

              var relations = _.map(enabledRelations, function (r) {
                var parts = r.relation.split('/');

                return [
                  {
                    indices: [ parts[0].replace('-slash-', '/') ],
                    path: parts[1].replace('-slash-', '/')
                  },
                  {
                    indices: [ parts[2].replace('-slash-', '/') ],
                    path: parts[3].replace('-slash-', '/')
                  }
                ];
              });

              var labels = queryHelper.getLabelsInConnectedComponent(focusIndex, relations);
              // keep only the filters which are in the connected component
              _.each(filtersPerIndex, function (filters, indexId) {
                if (!_.contains(labels, indexId)) {
                  delete filtersPerIndex[indexId];
                }
              });

              // keep only the queries which are in the connected component
              _.each(queriesPerIndex, function (queries, indexId) {
                if (!_.contains(labels, indexId)) {
                  delete queriesPerIndex[indexId];
                }
              });

              // build the join_set filter
              return queryHelper.constructJoinFilter(
                focusIndex,
                relations,
                filtersPerIndex,
                queriesPerIndex,
                indexToDashboardsMap
              );

            });

          }).then(function (joinFilter) {
            fulfill(joinFilter);
          }).catch(function (err) {
            reject(err);
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
      return replace_or_add_join_set_filter(filterArray, joinFilter, stripMeta);
    };

    JoinFilterHelper.prototype.isRelationalPanelEnabled = function () {
      return !!config.get('kibi:relationalPanel');
    };

    JoinFilterHelper.prototype.isFilterJoinPluginInstalled = function () {
      return configFile.elasticsearch_plugins.indexOf('FilterJoinPlugin') !== -1;
    };

    return new JoinFilterHelper();
  };
});
