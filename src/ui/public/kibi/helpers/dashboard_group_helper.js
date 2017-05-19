define(function (require) {
  const isJoinPruned = require('ui/kibi/helpers/is_join_pruned');

  return function DashboardGroupHelperFactory(
      $timeout, kibiState, Private, savedDashboards, savedDashboardGroups, Promise, kbnIndex, $http, config) {
    const _ = require('lodash');
    const dashboardHelper = Private(require('ui/kibi/helpers/dashboard_helper'));
    const countHelper = Private(require('ui/kibi/helpers/count_helper/count_helper'));
    const kibiUtils = require('kibiutils');
    const SearchHelper = require('ui/kibi/helpers/search_helper');
    const chrome = require('ui/chrome');

    function DashboardGroupHelper() {
      this.chrome = chrome;
      this.searchHelper = new SearchHelper(kbnIndex);
    }

    DashboardGroupHelper.prototype.getIdsOfDashboardGroupsTheseDashboardsBelongTo = function (dashboardIds) {
      return savedDashboardGroups.find().then(function (resp) {
        const ret = [];
        _.each(resp.hits, function (hit) {
          const id = hit.id;
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
      const g = groupTitle.toLowerCase();
      const d = dashboardTitle.toLowerCase();
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
        return dashboardHelper.switchDashboard(dashboardId);
      }, 750);
      return lastEventTimer;
    };

    DashboardGroupHelper.prototype.constructFilterIconMessage = function (filters, queries) {
      if (queries || filters) {
        const nFilters = _.reject(filters, 'meta.fromSavedSearch').length;
        const hasQuery = !kibiState._isDefaultQuery(queries[0]);

        if (hasQuery && nFilters) {
          return `This dashboard has a query and ${nFilters} filter${nFilters > 1 ? 's' : ''} set.`;
        } else if (hasQuery) {
          return 'This dashboard has a query set.';
        } else if (nFilters) {
          return `This dashboard has ${nFilters} filter${nFilters > 1 ? 's' : ''} set.`;
        }
      }
      return null;
    };

    const updateCountOnMetadata = function (metadata, responses) {
      if (responses && metadata) {
        if (responses.length === metadata.length) {
          for (let i = 0; i < responses.length; i++) {
            const hit = responses[i];
            if (metadata[i].forbidden) {
              metadata[i].count = 'Forbidden';
            } else if (!_.contains(Object.keys(hit), 'error')) {
              metadata[i].count = hit.hits.total;
            } else if (_.contains(Object.keys(hit), 'error') && _.contains(hit.error, 'ElasticsearchSecurityException')) {
              metadata[i].count = 'Forbidden';
            } else {
              metadata[i].count = 'Error';
            }
            metadata[i].isPruned = isJoinPruned(hit);
          }
        } else {
          throw new Error('Metadata size different than responses size');
        }
      }
    };

    let lastFiredMultiCountsQuery;
    let lastMultiCountsQueryResults;
    DashboardGroupHelper.prototype.getDashboardsMetadata = function (ids, forceCountsUpdate = false) {
      const self = this;
      const idsArray = Array.from(ids); // has to do it as it might be a set
      return savedDashboards.find().then((resp) => {
        const dashboards = _.filter(resp.hits, (dashboard) => {
          return dashboard.savedSearchId && idsArray.indexOf(dashboard.id) !== -1
            && config.get('kibi:enableAllDashboardsCounts');
        });

        const metadataPromises = _.map(dashboards, (dashboard) => {
          return kibiState.getState(dashboard.id)
          .then(({ index, filters, queries, time }) => {
            const query = countHelper.constructCountQuery(filters, queries, time);
            // here take care about correctly expanding timebased indices
            return kibiState.timeBasedIndices(index, dashboard.id)
            .then((indices) => ({
              dashboardId: dashboard.id,
              filters: filters,
              queries: queries,
              query: query,
              indices: indices
            }))
            .catch((error) => {
              // If computing the indices failed because of an authorization error
              // set indices to an empty array and mark the dashboard as forbidden.
              if (error.status === 403) {
                return {
                  dashboardId: dashboard.id,
                  filters: filters,
                  queries: queries,
                  query: query,
                  forbidden: true,
                  indices: []
                };
              }
              throw error;
            });
          });
        });

        return Promise.all(metadataPromises).then((metadata) => {
          // here fire the query to get counts
          const countsQuery = _.map(metadata, result => {
            return self.searchHelper.optimize(result.indices, result.query);
          }).join('');

          if (!countsQuery) {
            return metadata;
          } else if (countsQuery && lastFiredMultiCountsQuery && lastFiredMultiCountsQuery === countsQuery && !forceCountsUpdate) {
            updateCountOnMetadata(metadata, lastMultiCountsQueryResults);
            return metadata;
          } else {
            return $http.post(self.chrome.getBasePath() + '/elasticsearch/_msearch?getCountsOnTabs', countsQuery).then((counts) => {
              lastFiredMultiCountsQuery = countsQuery;
              lastMultiCountsQueryResults = counts.data.responses;
              updateCountOnMetadata(metadata, lastMultiCountsQueryResults);
              return metadata;
            });
          }
        });
      });
    };

    DashboardGroupHelper.prototype._getDashboardForGroup = function (groupId, groupTitle, dashboardDef) {
      const self = this;
      return {
        id: dashboardDef.id,
        title: self.shortenDashboardName(groupTitle, dashboardDef.title),
        savedSearchId: dashboardDef.savedSearchId,
        onSelect: function (dashboardGroups) {
          // NOTE:
          // do NOT return if currentDashboardId === dashboardDef.id
          // previously we thought we should do nothing in such case but later
          // we found that clicking on a dashboard to refresh it is very useful feature
          self._getOnClickForDashboardInGroup(dashboardGroups, dashboardDef.id, groupId);
        },
        onOpenClose: function (group) {
          // take all dashboards except the selected one
          const dashboardIds = _.filter(group.dashboards, d => d.id !== group.selected.id).map(d => d.id);
          self.getDashboardsMetadata(dashboardIds).then((metadata) => {
            _.each(group.dashboards, (d) => {
              const foundDashboardMetadata = _.find(metadata, (m) => {
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
      const self = this;

      // get all dashboard groups
      return savedDashboardGroups.find().then(function (respGroups) {
        if (!respGroups.hits) {
          return [];
        }
        // here first fetch all dashboards to be able to verify that dashboards mentioned in the group still exists
        return savedDashboards
        .find()
        .then(function (respDashboards) {
          const listOfDashboards = _.map(respDashboards.hits, function (hit) {
            return hit.id;
          });

          const dashboardGroups1 = [];
          // first iterate over existing groups
          _.each(respGroups.hits, function (group) {

            // ignore empty dashboard objects inside a dashboard group
            group.dashboards = _.filter(group.dashboards, function (dashboard) {
              return dashboard.id !== undefined && dashboard.title !== undefined &&
                listOfDashboards.indexOf(dashboard.id) !== -1;
            });

            // selected dashboard
            let selected;

            const dashboards = _.map(group.dashboards, function (d) {
              const dashboard = self._getDashboardForGroup(group.id, group.title, d);
              if (currentDashboardId && currentDashboardId === dashboard.id) {
                selected = dashboard;
              }
              return dashboard;
            });

            // try to get the last selected one for this group
            if (!selected && dashboards.length > 0) {
              const lastSelectedId = kibiState.getSelectedDashboardId(group.id);
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

            // if there are no dashboards omit the group
            if (dashboards.length === 0) {
              return;
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

          return dashboardGroups1;
        });
      });
    };

    DashboardGroupHelper.prototype._getListOfDashboardsFromGroups = function (dashboardGroups) {
      const dashboardsInGroups = [];
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
      const self = this;
      // first create array of dashboards already used in dashboardGroups1
      const dashboardsInGroups = self._getListOfDashboardsFromGroups(dashboardGroups1);
      const highestGroup = _.max(dashboardGroups1, 'priority');
      let highestPriority = highestGroup && highestGroup.priority || 0;

      return savedDashboards.find().then(function (savedDashboards) {
        _.each(savedDashboards.hits, function (dashboardDef) {
          let isInGroups = false;
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
            const groupId = kibiUtils.slugifyId(dashboardDef.title);
            const groupTitle = dashboardDef.title;
            const onlyOneDashboard = self._getDashboardForGroup(groupId, groupTitle, dashboardDef);

            dashboardGroups1.push({
              id: groupId,
              title: groupTitle,
              dashboards: [onlyOneDashboard],
              selected: onlyOneDashboard,
              priority: dashboardDef.priority ? dashboardDef.priority : ++highestPriority
            });
          }
        });

        // mark the active group
        let activeSelected = false;
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
          const filterIconMessage = previousGroup.selected.filterIconMessage;
          const count = previousGroup.selected.count;
          const isPruned = previousGroup.selected.isPruned;
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
      const currentDashboardId = kibiState._getCurrentDashboardId();
      return this._computeGroupsFromSavedDashboardGroups(currentDashboardId)
      .then((dashboardGroups1) => this._addAdditionalGroupsFromSavedDashboards(currentDashboardId, dashboardGroups1));
    };

    return new DashboardGroupHelper();
  };

});
