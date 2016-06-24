define(function (require) {
  return function DashboardGroupHelperFactory(Private, savedSearches, savedDashboards, savedDashboardGroups, Promise, kibiState) {
    var _ = require('lodash');
    var urlHelper        = Private(require('ui/kibi/helpers/url_helper'));
    var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
    var joinFilterHelper = Private(require('ui/kibi/helpers/join_filter_helper/join_filter_helper'));
    var countHelper      = Private(require('ui/kibi/helpers/count_helper/count_helper'));

    function DashboardGroupHelper() {
    }

    DashboardGroupHelper.prototype.getIdsOfDashboardGroupsTheseDashboardsBelongTo = function (dashboardIds) {
      return new Promise(function (fulfill, reject) {
        savedDashboardGroups.find('').then(function (resp) {
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
              reject(new Error('Property dashboards should be and Array, but was [' + JSON.stringify(hit.dashboards, null, '') + ']'));
            }
          });
          fulfill(_.unique(ret));
        });
      });
    };

    var sortByPriority = function (dashboardGroups) {
      dashboardGroups.sort(function (a, b) {
        if (a.priority && b.priority) {
          return a.priority - b.priority;
        }
        return 0;
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

    DashboardGroupHelper.prototype._getOnClickForDashboardInGroup = function (dashboardId, groupId) {
      // here save which one was selected for
      const currentDashboardId = urlHelper.getCurrentDashboardId();
      kibiStateHelper.saveFiltersForDashboardId(currentDashboardId, urlHelper.getDashboardFilters(currentDashboardId));
      kibiStateHelper.saveQueryForDashboardId(currentDashboardId, urlHelper.getDashboardQuery(currentDashboardId));

      if (groupId) {
        kibiStateHelper.saveSelectedDashboardId(groupId, dashboardId);
      }

      if (joinFilterHelper.isRelationalPanelEnabled()) {
        joinFilterHelper.getJoinFilter(dashboardId).then(function (joinFilter) {
          if (joinFilter) {
            urlHelper.addFilter(dashboardId, joinFilter);
          }
        }).finally(function () {
          urlHelper.switchDashboard(dashboardId);
        });
      } else {
        urlHelper.switchDashboard(dashboardId);
      }
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

              var dashboard = {
                id: d.id,
                title: self.shortenDashboardName(group.title, d.title),
                onClick: function () {
                  self._getOnClickForDashboardInGroup(d.id, group.id);
                },
                filters: kibiStateHelper.getFiltersForDashboardId(d.id)
              };
              if (currentDashboardId === d.id) {
                selected = dashboard;
              }
              return dashboard;
            });


            // try to get the last selected one for this group
            if (!selected && dashboards.length > 0) {
              var lastSelectedId = kibiStateHelper.getSelectedDashboardId(group.id);
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
              title: group.title,
              priority: group.priority,
              dashboards: dashboards,
              selected: selected,
              _selected: selected,
              hide: group.hide,
              iconCss: group.iconCss,
              iconUrl: group.iconUrl,
              onClick: function () {
                this.selected.onClick();
              }
            });

          }); // end of each

          if (fail) {
            return Promise.reject(new Error(fail));
          }

          sortByPriority(dashboardGroups1);

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

      return urlHelper.getDashboardAndSavedSearchMetas(undefined, true).then(function (results) {
        const promises = _.map(results, function ({ savedDash, savedSearchMeta }) {
          if (savedSearchMeta) {
            return {
              id: savedDash.id,
              title: savedDash.title,
              indexPatternId: savedSearchMeta.index,
              savedSearchId: savedDash.savedSearchId
            };
          } else {
            return {
              id: savedDash.id,
              title: savedDash.title,
              indexPatternId: null,
              savedSearchId: null
            };
          }
        });

        return Promise.all(promises).then(function (dashboardDefs) {

          _.each(dashboardDefs, function (dashboardDef) {
            var isInGroups = false;
            _.each(dashboardsInGroups, function (dashboard) {
              if (dashboard.id === dashboardDef.id) {
                dashboard.indexPatternId = dashboardDef.indexPatternId;
                dashboard.savedSearchId = dashboardDef.savedSearchId;
                isInGroups = true;
                return false;
              }
            });

            // so now we know that this dashboard is not in any group
            if (isInGroups === false) {
              // not in a group so add it as new group with single dashboard
              var onlyOneDashboard = {
                id: dashboardDef.id,
                title: dashboardDef.title,
                indexPatternId: dashboardDef.indexPatternId,
                savedSearchId: dashboardDef.savedSearchId,
                filters: kibiStateHelper.getFiltersForDashboardId(dashboardDef.id)
              };

              dashboardGroups1.push({
                title: dashboardDef.title,
                dashboards: [onlyOneDashboard],
                selected: onlyOneDashboard,
                _selected: onlyOneDashboard,
                onClick: function () {
                  self._getOnClickForDashboardInGroup(dashboardDef.id, null);
                }
              });
            }
          });

          // mark the active group
          var activeSelected = false;
          _.each(dashboardGroups1, function (group) {
            _.each(group.dashboards, function (dashboard) {
              if (currentDashboardId === dashboard.id) {
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
      });
    };



    DashboardGroupHelper.prototype.getCountQueryForSelectedDashboard = function (groups, groupIndex) {
      var dashboard = groups[groupIndex].selected;

      if (!dashboard || !dashboard.indexPatternId) {
        delete groups[groupIndex].count;
        return Promise.resolve({
          query: undefined,
          indexPatternId: undefined,
          groupIndex: groupIndex
        });
      }

      return kibiState.getState(dashboard.id)
      .then(({ index, filters, queries, time }) => {
        const query = countHelper.constructCountQuery(filters, queries, time);
        return {
          groupIndex: groupIndex,
          query: query,
          indexPatternId: index
        };
      });
    };

    DashboardGroupHelper.prototype.detectJoinSetFilterInGroups = function (newDashboardGroups) {
      for (var gIndex = 0; gIndex < newDashboardGroups.length; gIndex++) {
        var g = newDashboardGroups[gIndex];
        if (g.dashboards) {
          for (var dIndex = 0; dIndex < g.dashboards.length; dIndex++) {
            var d = g.dashboards[dIndex];
            var filtersDashboard = kibiStateHelper.getFiltersForDashboardId(d.id);
            if (filtersDashboard) {
              // check if there is a join_set in the kibi state
              for (var fdIndex = 0; fdIndex < filtersDashboard.length; fdIndex++) {
                var fd = filtersDashboard[fdIndex];
                if (fd.join_set) {
                  // return all groups
                  return true;
                }
              }
            }
            if (d.filters) {
              for (var fIndex = 0; fIndex < d.filters.length; fIndex++) {
                var f = d.filters[fIndex];
                if (f.join_set) {
                  // return all groups
                  return true;
                }
              }
            }
          }
        }
      }
      return false;
    };

    /**
     * when possible update just the different properties
     * if not possible to update just properties - update the whole dashboard or whole group
     *
     * return the list of group indexes on which the count should be updated
     */
    DashboardGroupHelper.prototype.updateDashboardGroups = function (oldDashboardGroups, newDashboardGroups) {
      var groupIndexesToUpdateCountsOn = [];
      var reasons = [];


      for (var gIndex = 0; gIndex < newDashboardGroups.length; gIndex++) {
        var g = newDashboardGroups[gIndex];
        // if not the same group replace
        if (oldDashboardGroups[gIndex].title !== g.title) {
          oldDashboardGroups[gIndex] = g;
          if (groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
            groupIndexesToUpdateCountsOn.push(gIndex);
            reasons.push('different titles for group ' + gIndex);
          }
          continue;
        } else {
          // the same group lets compare more
          if (oldDashboardGroups[gIndex].dashboards.length !== g.dashboards.length) {
            oldDashboardGroups[gIndex] = g;
            if (groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
              groupIndexesToUpdateCountsOn.push(gIndex);
              reasons.push('different number of dashboards for group ' + gIndex);
            }
            continue;
          }

          if (oldDashboardGroups[gIndex].active !== g.active) {
            oldDashboardGroups[gIndex].active = g.active;
          }

          if (oldDashboardGroups[gIndex].iconCss !== g.iconCss) {
            oldDashboardGroups[gIndex].iconCss = g.iconCss;
          }

          if (oldDashboardGroups[gIndex].iconUrl !== g.iconUrl) {
            oldDashboardGroups[gIndex].iconUrl = g.iconUrl;
          }
          // selected is tricky as it will be changed by the select input element
          // so instead compare with _selected
          if (oldDashboardGroups[gIndex]._selected.id !== g._selected.id) {

            // put the old count first so in case it will be the same it will not flip
            g.count = oldDashboardGroups[gIndex].count;

            // here write the whole group to the scope as
            // selected must be a proper reference to the correct object in dashboards array
            oldDashboardGroups[gIndex] = g;
            if (groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
              groupIndexesToUpdateCountsOn.push(gIndex);
              reasons.push('different selected dashboard for group ' + gIndex);
            }
          }
          // now compare each dashboard
          var updateCount = false;
          for (var dIndex = 0; dIndex < oldDashboardGroups[gIndex].dashboards.length; dIndex++) {
            var d = newDashboardGroups[gIndex].dashboards[dIndex];

            // first check that the number of filters changed on selected dashboard
            if (oldDashboardGroups[gIndex].selected.id === d.id &&
                !_.isEqual(oldDashboardGroups[gIndex].dashboards[dIndex].filters, d.filters, true)
            ) {
              oldDashboardGroups[gIndex].dashboards[dIndex].filters = d.filters;
              reasons.push('different number of filters for dashboard ' + dIndex + ' for group ' + gIndex);
              updateCount = true;
            }

            if (oldDashboardGroups[gIndex].selected.id === d.id &&
                oldDashboardGroups[gIndex].dashboards[dIndex].indexPatternId !== d.indexPatternId
            ) {
              oldDashboardGroups[gIndex].dashboards[dIndex].indexPatternId = d.indexPatternId;
              reasons.push('different indexPatternId for dashboard ' + dIndex + ' for group ' + gIndex);
              updateCount = true;
            }

            if (oldDashboardGroups[gIndex].selected.id === d.id &&
                oldDashboardGroups[gIndex].dashboards[dIndex].savedSearchId !== d.savedSearchId
            ) {
              oldDashboardGroups[gIndex].dashboards[dIndex].savedSearchId = d.savedSearchId;
              reasons.push('different savedSearchId for dashboard ' + dIndex + ' for group ' + gIndex);
              updateCount = true;
            }

            // then if it is not the same dashboard on the same position
            if (oldDashboardGroups[gIndex].dashboards[dIndex].id !== d.id) {
              oldDashboardGroups[gIndex].dashboards[dIndex] = d;
              reasons.push('different dashboard id for dashboard ' + dIndex + ' for group ' + gIndex);
              updateCount = true;
            }
          }

          if (updateCount && groupIndexesToUpdateCountsOn.indexOf(gIndex) === -1) {
            groupIndexesToUpdateCountsOn.push(gIndex);
          }
        }
      }


      // if there is a join_set filter on any dashboard just update all groups
      // this can not go at the top as the code above if modifying the oldDashboardGroups
      // e.g updating the selected one etc...
      if (this.detectJoinSetFilterInGroups(newDashboardGroups)) {
        for (var i = 0; i < newDashboardGroups.length; i++) {
          groupIndexesToUpdateCountsOn.push(i);
        }
        return {
          indexes: groupIndexesToUpdateCountsOn,
          reasons: ['There is a join_set filter so lets update all groups']
        };
      }

      return {
        indexes: groupIndexesToUpdateCountsOn,
        reasons: reasons
      };
    };

    /*
     * Computes the dashboard groups array
     *
     *  [
          {
            title:
            priority:
            dashboards:
            selected:
            _selected:
            iconCss:
            iconUrl:
            onClick:
          },
          ...
        ]
     *
     * groups in this array are used to render tabs
     *
     */
    DashboardGroupHelper.prototype.computeGroups = function () {
      var self = this;
      var currentDashboardId = urlHelper.getCurrentDashboardId();
      return self._computeGroupsFromSavedDashboardGroups(currentDashboardId).then(function (dashboardGroups1) {
        return self._addAdditionalGroupsFromSavedDashboards(currentDashboardId, dashboardGroups1);
      });
    };


    return new DashboardGroupHelper();
  };

});
