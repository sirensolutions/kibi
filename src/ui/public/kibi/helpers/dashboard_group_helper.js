define(function (require) {
  var isHitPruned = require('ui/kibi/helpers/is_pruned');

  return function DashboardGroupHelperFactory(
      $timeout, kbnUrl, kibiState, Private, savedDashboards, savedDashboardGroups, Promise, kbnIndex, $http) {
    var _ = require('lodash');
    var countHelper = Private(require('ui/kibi/helpers/count_helper/count_helper'));
    var kibiUtils = require('kibiutils');
    const SearchHelper = require('ui/kibi/helpers/search_helper');

    function DashboardGroupHelper() {
      this.chrome = null;
      this.searchHelper = new SearchHelper(kbnIndex);
    }

    DashboardGroupHelper.prototype.setChrome = function (c) {
      this.chrome = c;
    };

    DashboardGroupHelper.prototype.getIdsOfDashboardGroupsTheseDashboardsBelongTo = function (dashboardIds) {
      return savedDashboardGroups.find().then(function (resp) {
        var ret = [];
        _.each(resp.hits, function (hit) {
          var id = hit.id;
          if (hit.dashboards instanceof Array) {
            _.each(hit.dashboards, function (d) {
              if (dashboardIds.indexOf(d.id) !== -1) {
                ret.push(id);
              }
            });
          } else {
            const msg = `Property dashboards should be and Array, but was [${JSON.stringify(hit.dashboards, null, '')}]`;
            return Promise.reject(new Error(msg));
          }
        });
        return _.unique(ret);
      });
    };

    DashboardGroupHelper.prototype.shortenDashboardName = function (groupTitle, dashboardTitle) {
      var g = groupTitle.toLowerCase();
      var d = dashboardTitle.toLowerCase();
      if (d.indexOf(g) === 0 && d.length > g.length) {
        return dashboardTitle.substring(groupTitle.length).replace(/^[\s-]{1,}/, '');  // replace any leading spaces or dashes
      }
      return dashboardTitle;
    };

    DashboardGroupHelper.prototype.setSelectedDashboardAndActiveGroup = function (dashboardGroups, dashboardId, groupId) {
      // here iterate over dashboardGroups remove the active group
      // then set the new active group and set the selected dashboard
      _.each(dashboardGroups, function (group) {
        if (group.id === groupId) {
          group.active = true;
          _.each(group.dashboards, function (dashboard) {
            if (dashboard.id === dashboardId) {
              group.selected = dashboard;
              return false; // to break the loop
            }
          });
        } else {
          group.active = false;
        }
      });
    };

    let lastEventTimer;
    DashboardGroupHelper.prototype._getOnClickForDashboardInGroup = function (dashboardGroups, dashboardId, groupId) {
      $timeout.cancel(lastEventTimer);
      lastEventTimer = $timeout(() => {
        // here save which one was selected for
        if (groupId) {
          this.setSelectedDashboardAndActiveGroup(dashboardGroups, dashboardId, groupId);
          kibiState.setSelectedDashboardId(groupId, dashboardId);
          kibiState.save();
        }

        return kibiState.saveAppState()
        .then(() => {
          kbnUrl.change('/dashboard/{{id}}', {id: dashboardId});
        });
      }, 750);
      return lastEventTimer;
    };

    DashboardGroupHelper.prototype.constructFilterIconMessage = function (filters, queries) {
      if (queries || filters) {
        if (queries.length > 1 && filters.length !== 0) {
          return 'This dashboard has a query and ' + filters.length + ' filter' + (filters.length > 1 ? 's' : '') + ' set.';
        } else if (queries.length > 1) {
          return 'This dashboard has a query set.';
        } else if (filters.length !== 0) {
          return 'This dashboard has ' + filters.length + ' filter' + (filters.length > 1 ? 's' : '') + ' set.';
        }
      }
      return null;
    };

    var lastFiredMultiCountsQuery;
    DashboardGroupHelper.prototype.getDashboardsMetadata = function (ids, forceCountsUpdate = false) {
      var self = this;
      return savedDashboards.find().then((resp) => {
        var dashboards = _.filter(resp.hits, (dashboard) => {
          return dashboard.savedSearchId && ids.indexOf(dashboard.id) !== -1;
        });

        let metadataPromises = _.map(dashboards, (dashboard) => {
          return kibiState.getState(dashboard.id).then(({ index, filters, queries, time }) => {
            const query = countHelper.constructCountQuery(filters, queries, time);
            // here take care about correctly expanding timebased indices
            return kibiState.timeBasedIndices(index, dashboard.id).then(function (indices) {
              return {
                dashboardId: dashboard.id,
                filters: filters,
                queries: queries,
                query: query,
                indices: indices
              };
            });
          });
        });

        return Promise.all(metadataPromises).then((metadata) => {
          // here fire the query to get counts
          const countsQuery = _.map(metadata, result => {
            return self.searchHelper.optimize(result.indices, result.query);
          }).join('');

          if (countsQuery && (lastFiredMultiCountsQuery !== countsQuery || forceCountsUpdate)) {
            lastFiredMultiCountsQuery = countsQuery;
            return $http.post(self.chrome.getBasePath() + '/elasticsearch/_msearch?getCountsOnTabs', countsQuery).then((counts) => {
              if (counts.data.responses) {
                for (var i = 0; i < counts.data.responses.length; i++) {
                  var hit = counts.data.responses[i];
                  if (!_.contains(Object.keys(hit), 'error')) {
                    metadata[i].count = hit.hits.total;
                  } else if (_.contains(Object.keys(hit), 'error') && _.contains(hit.error, 'ElasticsearchSecurityException')) {
                    metadata[i].count = 'Unauthorized';
                  } else {
                    metadata[i].count = 'Error';
                  }
                  metadata[i].isPruned = isHitPruned(hit);
                }
              }
              return metadata;
            });
          }
          return metadata;
        });
      });
    };

    DashboardGroupHelper.prototype._getDashboardForGroup = function (groupId, groupTitle, dashboardDef) {
      var self = this;
      return {
        id: dashboardDef.id,
        title: self.shortenDashboardName(groupTitle, dashboardDef.title),
        savedSearchId: dashboardDef.savedSearchId,
        onSelect: function (dashboardGroups) {
          var currentDashboardId = kibiState._getCurrentDashboardId();
          if (currentDashboardId === dashboardDef.id) {
            // do nothing as we are already at the corret dashboard
            return;
          }
          self._getOnClickForDashboardInGroup(dashboardGroups, dashboardDef.id, groupId);
        },
        onOpenClose: function (group) {
          // take all dashboards except the selected one
          var dashboardIds = _.filter(group.dashboards, d => d.id !== group.selected.id).map(d => d.id);
          self.getDashboardsMetadata(dashboardIds).then((metadata) => {
            _.each(group.dashboards, (d) => {
              var foundDashboardMetadata = _.find(metadata, (m) => {
                return m.dashboardId === d.id;
              });
              if (foundDashboardMetadata) {
                d.count = foundDashboardMetadata.count;
                d.isPruned = foundDashboardMetadata.isPruned;
                d.filterIconMessage = self.constructFilterIconMessage(foundDashboardMetadata.filters, foundDashboardMetadata.queries);
              }
            });
          });
        }
      };
    };

    DashboardGroupHelper.prototype._computeGroupsFromSavedDashboardGroups = function (currentDashboardId) {
      var self = this;

      // get all dashboard groups
      return savedDashboardGroups.find().then(function (respGroups) {
        if (!respGroups.hits) {
          return [];
        }
        // here first fetch all dashboards to be able to verify that dashboards mentioned in the group still exists
        return savedDashboards.find().then(function (respDashboards) {
          var listOfDashboards = _.map(respDashboards.hits, function (hit) {
            return hit.id;
          });

          var dashboardGroups1 = [];
          var fail = '';
          // first iterate over existing groups
          _.each(respGroups.hits, function (group) {

            // selected dashboard
            var selected;
            var dashboards = [];
            var dashboardsArray = group.dashboards;
            // check that all dashboards still exists
            // in case there is one which does not display a warning
            _.each(dashboardsArray, function (d) {
              if (listOfDashboards.indexOf(d.id) === -1) {
                fail = '"' + group.title + '"' + ' dashboard group contains non existing dashboard "' + d.id + '". ' +
                  'Edit dashboard group to remove non existing dashboard';
                return false;
              }
            });

            if (fail) {
              return false;
            }

            dashboards = _.map(dashboardsArray, function (d) {
              var dashboard = self._getDashboardForGroup(group.id, group.title, d);
              if (currentDashboardId && currentDashboardId === dashboard.id) {
                selected = dashboard;
              }
              return dashboard;
            });

            // try to get the last selected one for this group
            if (!selected && dashboards.length > 0) {
              var lastSelectedId = kibiState.getSelectedDashboardId(group.id);
              _.each(dashboards, function (dashboard) {
                if (dashboard.id === lastSelectedId) {
                  selected = dashboard;
                  return false;
                }
              });
            }

            // nothing worked select the first one
            if (!selected && dashboards.length > 0) {
              selected = dashboards[0];
            }

            dashboardGroups1.push({
              id: group.id,
              title: group.title,
              hide: group.hide,
              iconCss: group.iconCss,
              iconUrl: group.iconUrl,
              priority: group.priority,
              dashboards: dashboards,
              selected: selected
            });

          }); // end of each

          if (fail) {
            return Promise.reject(new Error(fail));
          }

          return dashboardGroups1;
        });
      });
    };

    DashboardGroupHelper.prototype._getListOfDashboardsFromGroups = function (dashboardGroups) {
      var dashboardsInGroups = [];
      _.each(dashboardGroups, function (group) {
        if (group.dashboards) {
          _.each(group.dashboards, function (dashboard) {
            if (_.find(dashboardsInGroups, function (d) {
              return d.id === dashboard.id;
            }) === undefined) {
              dashboardsInGroups.push(dashboard);
            }
          });
        }
      });
      return dashboardsInGroups;
    };

    DashboardGroupHelper.prototype._addAdditionalGroupsFromSavedDashboards = function (currentDashboardId, dashboardGroups1) {
      var self = this;
      // first create array of dashboards already used in dashboardGroups1
      var dashboardsInGroups = self._getListOfDashboardsFromGroups(dashboardGroups1);
      let highestGroup = _.max(dashboardGroups1, 'priority');
      let highestPriority = highestGroup && highestGroup.priority || 0;

      return savedDashboards.find().then(function (savedDashboards) {
        _.each(savedDashboards.hits, function (dashboardDef) {
          var isInGroups = false;
          _.each(dashboardsInGroups, function (dashboard) {
            if (dashboard.id === dashboardDef.id) {
              // here add savedSearchId property to all already existing dashboard objects
              dashboard.savedSearchId = dashboardDef.savedSearchId;
              isInGroups = true;
              return false;
            }
          });

          // so now we know that this dashboard is not in any group
          if (isInGroups === false) {
            // not in a group so add it as new group with single dashboard
            var groupId = kibiUtils.slugifyId(dashboardDef.title);
            var groupTitle = dashboardDef.title;
            var onlyOneDashboard = self._getDashboardForGroup(groupId, groupTitle, dashboardDef);

            dashboardGroups1.push({
              id: groupId,
              title: groupTitle,
              dashboards: [onlyOneDashboard],
              selected: onlyOneDashboard,
              priority: ++highestPriority
            });
          }
        });

        // mark the active group
        var activeSelected = false;
        _.each(dashboardGroups1, function (group) {
          _.each(group.dashboards, function (dashboard) {
            if (currentDashboardId && currentDashboardId === dashboard.id) {
              group.active = true;
              activeSelected = true;
              return false;
            }
          });
          if (activeSelected) {
            return false;
          }
        });

        if (!activeSelected && dashboardGroups1.length > 0) {
          // make the first one active
          dashboardGroups1[0].active = true;
        }

        // only here we can fulfill the promise
        return dashboardGroups1;
      });
    };

    /**
     * Copies dashboards groups from src to dest.
     * Modifies the dest object.
     */
    DashboardGroupHelper.prototype.copy = function (src, dest) {
      if (!dest) {
        throw new Error('Dest object should be defined');
      }

      _.each(src, (group) => {
        const previousGroup = _.find(dest, { id: group.id });
        if (previousGroup) {
          previousGroup.active = group.active;
          previousGroup.dashboards = group.dashboards;
          previousGroup.hide = group.hide;
          previousGroup.iconCss = group.iconCss;
          previousGroup.iconUrl = group.iconUrl;
          previousGroup.priority = group.priority;
          previousGroup.title = group.title;

          // when copying selected reference we keep the count, filterIconMessage and isPruned
          // properties from the previous group
          var filterIconMessage = previousGroup.selected.filterIconMessage;
          var count = previousGroup.selected.count;
          var isPruned = previousGroup.selected.isPruned;
          previousGroup.selected = group.selected;
          previousGroup.selected.filterIconMessage = filterIconMessage;
          previousGroup.selected.count = count;
          previousGroup.selected.isPruned = isPruned;
        } else {
          // new group
          dest.push(group);
        }
      });
      for (let destIndex = dest.length - 1; destIndex >= 0; destIndex--) {
        const srcIndex = _.findIndex(src, { id: dest[destIndex].id });
        if (srcIndex === -1) {
          dest.splice(destIndex, 1);
        }
      }
    };

    /*
     * Computes the dashboard groups array
     *
     *  [
          {
            title:
            priority:
            dashboards: [
              {
                id:
                title:
                onSelect:
                onOpenClose:
              },
              ...
            ]
            iconCss:
            iconUrl:
            selected: dashboard
          },
          ...
        ]
     *
     * groups in this array are used to render tabs
     *
     */
    DashboardGroupHelper.prototype.computeGroups = function () {
      var currentDashboardId = kibiState._getCurrentDashboardId();
      return this._computeGroupsFromSavedDashboardGroups(currentDashboardId)
      .then((dashboardGroups1) => this._addAdditionalGroupsFromSavedDashboards(currentDashboardId, dashboardGroups1));
    };

    return new DashboardGroupHelper();
  };

});
