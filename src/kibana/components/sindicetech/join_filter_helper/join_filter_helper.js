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

    JoinFilterHelper.prototype.isDashboardInEnabledRelations = function (dashboardId, relations) {
      for (var i = 0; i < relations.length; i++) {
        if (relations[i].enabled && relations[i].from === dashboardId || relations[i].to === dashboardId) {
          return true;
        }
      }
      return false;
    };


    JoinFilterHelper.prototype.findIndexAssociatedToDashboard = function (indexToDashboardsMap, dashboardId) {
      for (var indexId in indexToDashboardsMap) {
        if (indexToDashboardsMap.hasOwnProperty(indexId)) {
          if (indexToDashboardsMap[indexId].indexOf(dashboardId) !== -1) {
            return indexId;
          }
        }
      }
    };

    JoinFilterHelper.prototype.getJoinFilter = function (focusDashboardId) {
      var self = this;
      return new Promise(function (fulfill, reject) {
        if (focusDashboardId) {
          var relationalPanelConfig = config.get('kibi:relationalPanelConfig');
          if (!relationalPanelConfig) {
            reject(new Error('Could not get kibi:relationalPanelConfig'));
          }
          if (!relationalPanelConfig.relations) {
            reject(new Error('Could not get kibi:relationalPanelConfig.relations'));
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
          var enabledRelations = _.filter(relationalPanelConfig.relations, function (relation) {
            return relation.enabled === true;
          });

          // collect ids of dashboards from enabled relations
          var dashboardIds = [];
          _.each(enabledRelations, function (relation) {
            if (dashboardIds.indexOf(relation.from) === -1) {
              dashboardIds.push(relation.from);
            }
            if (dashboardIds.indexOf(relation.to) === -1) {
              dashboardIds.push(relation.to);
            }
          });

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
            var isFocusDashboardInEnabledRelations = self.isDashboardInEnabledRelations(focusDashboardId, relationalPanelConfig.relations);
            if (!focusIndex) {
              reject(new Error('SavedSearch for [' +  focusDashboardId + '] dashboard seems to not have an index id'));
              return;
            }
            if (!isFocusDashboardInEnabledRelations) {
              reject(new Error('The join filter has no enabled relation for the focused dashboard : ' +  focusDashboardId));
              return;
            }


            return urlHelper.getIndexToDashboardMap(dashboardIds).then(function (indexToDashboardsMap) {

              var relations = [];
              _.each(enabledRelations, function (r) {
                relations.push([
                  {
                    indices: [ self.findIndexAssociatedToDashboard(indexToDashboardsMap, r.from) ],
                    path: r.fromPath
                  },
                  {
                    indices: [ self.findIndexAssociatedToDashboard(indexToDashboardsMap, r.to) ],
                    path: r.toPath
                  }
                ]);
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
      return config.get('kibi:relationalPanelConfig') && config.get('kibi:relationalPanelConfig').enabled;
    };

    JoinFilterHelper.prototype.isFilterJoinPluginInstalled = function () {
      return configFile.elasticsearch_plugins.indexOf('FilterJoinPlugin') !== -1;
    };

    return new JoinFilterHelper();
  };
});
