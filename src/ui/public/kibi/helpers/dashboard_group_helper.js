define(function (require) {
  return function DashboardGroupHelperFactory(kbnUrl, kibiState, Private, savedDashboards, savedDashboardGroups, Promise) {
    var _ = require('lodash');
    var countHelper = Private(require('ui/kibi/helpers/count_helper/count_helper'));

    function DashboardGroupHelper() {
    }

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

    DashboardGroupHelper.prototype._getOnClickForDashboardInGroup = function (dashboardGroups, dashboardId, groupId) {
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
                onClick: function (dashboardGroups) {
                  self._getOnClickForDashboardInGroup(dashboardGroups, d.id, group.id);
                }
              };
              if (currentDashboardId === d.id) {
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
              priority: group.priority,
              dashboards: dashboards,
              selected: selected,
              hide: group.hide,
              iconCss: group.iconCss,
              iconUrl: group.iconUrl,
              onClick: function (dashboardGroups) {
                this.selected.onClick(dashboardGroups);
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

      return kibiState._getDashboardAndSavedSearchMetas(undefined, true).then(function (results) {
        const dashboardDefs = _.map(results, function ({ savedDash, savedSearchMeta }) {
          if (savedSearchMeta) {
            return {
              id: savedDash.id,
              title: savedDash.title,
              indexPatternId: savedSearchMeta.index,
              savedSearchId: savedDash.savedSearchId
            };
          }
          return {
            id: savedDash.id,
            title: savedDash.title,
            indexPatternId: null,
            savedSearchId: null
          };
        });

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
              savedSearchId: dashboardDef.savedSearchId
            };

            dashboardGroups1.push({
              title: dashboardDef.title,
              dashboards: [onlyOneDashboard],
              selected: onlyOneDashboard,
              onClick: function (dashboardGroups) {
                self._getOnClickForDashboardInGroup(dashboardGroups, dashboardDef.id, null);
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

    /*
     * Computes the dashboard groups array
     *
     *  [
          {
            title:
            priority:
            dashboards:
            selected:
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
      var currentDashboardId = kibiState._getCurrentDashboardId();
      if (!currentDashboardId) {
        return Promise.resolve([]);
      }
      return this._computeGroupsFromSavedDashboardGroups(currentDashboardId)
      .then((dashboardGroups1) => this._addAdditionalGroupsFromSavedDashboards(currentDashboardId, dashboardGroups1));
    };

    return new DashboardGroupHelper();
  };

});
