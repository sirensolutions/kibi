import QueryBuilderProvider from 'ui/kibi/helpers/query_builder';
import DashboardHelperProvider from 'ui/kibi/helpers/dashboard_helper';
import isJoinPruned from 'ui/kibi/helpers/is_join_pruned';
import _ from 'lodash';
import SearchHelper from 'ui/kibi/helpers/search_helper';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import MissingDashboardError from 'ui/kibi/errors/missing_dashboard_error';
import SimpleEmitter from 'ui/utils/simple_emitter';
import CacheProvider from 'ui/kibi/helpers/cache_helper';

uiRoutes
.addSetupWork($injector => {
  if ($injector.has('kibiState')) {
    $injector.get('dashboardGroups').init();
  }
});

uiModules
.get('kibana')
.service('dashboardGroups', (es, $timeout, kibiState, Private, savedDashboards, savedDashboardGroups, Promise, kbnIndex) => {
  const dashboardHelper = Private(DashboardHelperProvider);
  const queryBuilder = Private(QueryBuilderProvider);
  const searchHelper = new SearchHelper(kbnIndex);
  const selectDelay = 750;
  let lastSelectDashboardEventTimer;
  let lastFiredMultiCountsQuery;
  let lastMultiCountsQueryResults;
  const cache = Private(CacheProvider);

  const _getDashboardForGroup = function (groupId, groupTitle, dashboardDef) {
    return {
      id: dashboardDef.id,
      title: this._shortenDashboardName(groupTitle, dashboardDef.title),
      savedSearchId: dashboardDef.savedSearchId
    };
  };

  const _constructFilterIconMessage = function (filters, queries) {
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

  const _updateCountOnMetadata = function (metadata, responses) {
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

  class DashboardGroups extends SimpleEmitter {
    constructor() {
      super();
      this.init = _.once(() => {
        const groupsPromise = this.computeGroups('init');
        const metadataPromise = groupsPromise.then(groups => {
          const dashboardIds = _.map(groups, 'selected.id');
          return this.updateMetadataOfDashboardIds(dashboardIds);
        });

        return Promise.all([ groupsPromise, metadataPromise ])
        .then(([ groups ]) => {
          this.groups = groups;
        });
      });
    }

    _shortenDashboardName(groupTitle, dashboardTitle) {
      const g = groupTitle.toLowerCase();
      const d = dashboardTitle.toLowerCase();

      if (d.indexOf(g) === 0 && d.length > g.length) {
        return dashboardTitle.substring(groupTitle.length).replace(/^[\s-]{1,}/, '');  // replace any leading spaces or dashes
      }
      return dashboardTitle;
    }

    getGroups() {
      return this.groups;
    }

    setDashboardSelection(group, dashboard, state) {
      this.emit('dashboardSelected', group, dashboard, state);
    }

    setGroupSelection(group) {
      this.emit('groupSelected', group);
    }

    setGroupHighlight(dashboardId) {
      // here iterate over dashboardGroups remove all highlighted groups
      // then set the new highlight group
      _.each(this.getGroups(), function (group) {
        _.each(group.dashboards, function (dashboard) {
          if (dashboard.id === dashboardId) {
            dashboard.$$highlight = true;
          } else {
            dashboard.$$highlight = false;
          }
        });
      });
    }

    resetGroupHighlight() {
      // here iterate over dashboardGroups remove all highlighted groups
      _.each(this.getGroups(), function (group) {
        _.each(group.dashboards, function (dashboard) {
          dashboard.$$highlight = false;
        });
      });
    }

    renumberGroups() {
      let priority = 10;
      const saveActions = [];
      const groups = _.clone(_.sortBy(this.getGroups(), 'priority'));
      groups.forEach((group) => {
        group.priority = priority;
        priority += 10;
      });
      groups.forEach((group) => {
        if (group.virtual) {
          savedDashboards.get(group.id).then(savedDashboard => {
            savedDashboard.priority = group.priority;
            return savedDashboard.save();
          });
        } else {
          saveActions.push(savedDashboardGroups.get(group.id).then(savedGroup => {
            savedGroup.priority = group.priority;
            return savedGroup.save();
          }));
        }
      });
      saveActions.push(cache.invalidate);
      return Promise.all(saveActions);
    }

    getDashboardsInGroup(groupId) {
      const group = _.find(this.getGroups(), 'id', groupId);
      return group.dashboards;
    }

    _getDashboardsMetadata(ids, forceCountsUpdate = false) {
      return savedDashboards.find()
      .then((resp) => {
        const dashboards = _.filter(resp.hits, dashboard => dashboard.savedSearchId && _.contains(ids, dashboard.id));
        const metadataPromises = _.map(dashboards, (dashboard) => {
          return kibiState.getState(dashboard.id).then(({ index, filters, queries, time }) => {
            const query = queryBuilder(filters, queries, time);
            query.size = 0; // we do not need hits just a count
            // here take care about correctly expanding timebased indices
            return kibiState.timeBasedIndices(index, dashboard.id)
            .then((indices) => ({
              dashboardId: dashboard.id,
              filters,
              queries,
              query,
              indices
            }))
            .catch((error) => {
              // If computing the indices failed because of an authorization error
              // set indices to an empty array and mark the dashboard as forbidden.
              if (error.status === 403) {
                return {
                  dashboardId: dashboard.id,
                  filters,
                  queries,
                  query,
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
            return searchHelper.optimize(result.indices, result.query);
          }).join('');

          if (countsQuery) {
            if (lastFiredMultiCountsQuery && lastFiredMultiCountsQuery === countsQuery && !forceCountsUpdate) {
              _updateCountOnMetadata(metadata, lastMultiCountsQueryResults);
            } else {
              return es.msearch({ body: countsQuery })
              .then(response => {
                lastFiredMultiCountsQuery = countsQuery;
                lastMultiCountsQueryResults = response.responses;
                _updateCountOnMetadata(metadata, lastMultiCountsQueryResults);
                return metadata;
              });
            }
          }
          return metadata;
        });
      });
    }

    updateMetadataOfDashboardIds(ids, forceCountsUpdate = false) {
      if (console) {
        const msg = `update metadata for following dashboards: ${JSON.stringify(ids, null, ' ')}`;
        console.log(msg); // eslint-disable-line no-console
      }

      return this._getDashboardsMetadata(ids, forceCountsUpdate)
      .then(metadata => {
        _.each(this.getGroups(), (g) => {
          _.each(g.dashboards, (d) => {
            const foundDashboardMetadata = _.find(metadata, 'dashboardId', d.id);
            if (foundDashboardMetadata) {
              d.count = foundDashboardMetadata.count;
              d.isPruned = foundDashboardMetadata.isPruned;
              d.filterIconMessage = _constructFilterIconMessage(
                foundDashboardMetadata.filters,
                foundDashboardMetadata.queries
              );
            } else if (_.contains(ids, d.id)) {
              // count for that dashboard was requested but is not in the metadata, likely because it doesn't have a savedSearchId
              delete d.count;
              delete d.isPruned;
              delete d.filterIconMessage;
            }
          });
        });
      });
    }

    updateMetadataOfGroupId(groupId, forceCountsUpdate = false) {
      const group = _.find(this.getGroups(), 'id', groupId);
      // take all dashboards except the selected one
      const dashboardIds = _(group.dashboards).reject('id', group.selected.id).map('id').value();

      return this._getDashboardsMetadata(dashboardIds)
      .then(metadata => {
        _.each(group.dashboards, d => {
          const foundDashboardMetadata = _.find(metadata, 'dashboardId', d.id);
          if (foundDashboardMetadata) {
            d.count = foundDashboardMetadata.count;
            d.isPruned = foundDashboardMetadata.isPruned;
            d.filterIconMessage = _constructFilterIconMessage(foundDashboardMetadata.filters, foundDashboardMetadata.queries);
          }
        });
      });
    }

    getIdsOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds) {
      return _(this.getGroups())
      // do not consider groups that were created programmatically
      .reject('virtual')
      // keep only the groups which dashboards contains some of the ids passed in argument
      .filter(group => _.intersection(dashboardIds, _.pluck(group.dashboards, 'id')).length)
      // return the id of the groups
      .map('id')
      .value();
    }

    selectDashboard(dashboardId) {
      $timeout.cancel(lastSelectDashboardEventTimer);
      lastSelectDashboardEventTimer = $timeout(() => {
        // save which one was selected for:
        // - iterate over dashboard groups remove the active group
        // - set the new active group and set the selected dashboard
        _.each(this.getGroups(), group => {
          group.active = false;
        });
        const activeGroup = _.findWhere(this.getGroups(), { dashboards: [ { id: dashboardId } ] });
        activeGroup.active = true;
        activeGroup.selected = _.find(activeGroup.dashboards, 'id', dashboardId);
        if (!activeGroup.virtual) {
          kibiState.setSelectedDashboardId(activeGroup.id, dashboardId);
          kibiState.save();
        }
        return dashboardHelper.switchDashboard(dashboardId);
      }, selectDelay);
      return lastSelectDashboardEventTimer;
    }

    _getListOfDashboardsFromGroups(dashboardGroups) {
      const dashboardsInGroups = [];
      _.each(dashboardGroups, function (group) {
        if (group.dashboards) {
          _.each(group.dashboards, function (dashboard) {
            if (!_.find(dashboardsInGroups, 'id', dashboard.id)) {
              dashboardsInGroups.push(dashboard);
            }
          });
        }
      });
      return dashboardsInGroups;
    }

    /**
     * Copies dashboards groups from src to dest.
     * Modifies the dest object.
     */
    copy(src, dest) {
      if (!dest) {
        throw new Error('Dest object should be defined');
      }

      const _saveDashboardMeta = function (dash, fromDash) {
        _.assign(dash, {
          count: fromDash.count,
          isPruned: fromDash.isPruned,
          filterIconMessage: fromDash.filterIconMessage
        });
      };

      _.each(src, srcGroup => {
        const destGroup = _.find(dest, 'id', srcGroup.id);
        if (destGroup) {
          destGroup.virtual = srcGroup.virtual;
          destGroup.active = srcGroup.active;
          destGroup.hide = srcGroup.hide;
          destGroup.iconCss = srcGroup.iconCss;
          destGroup.iconUrl = srcGroup.iconUrl;
          destGroup.priority = srcGroup.priority;
          destGroup.title = srcGroup.title;

          // when copying selected reference we keep the count, filterIconMessage and isPruned properties
          // from the previously selected dashboard and all other dashboards in the group

          _saveDashboardMeta(srcGroup.selected, destGroup.selected);
          destGroup.selected = srcGroup.selected;

          // now for all the other dashboards in the group
          destGroup.dashboards = _.map(srcGroup.dashboards, srcDashboard => {
            const destDashboard = _.find(destGroup.dashboards, 'id', srcDashboard.id);

            if (destDashboard) {
              _saveDashboardMeta(srcDashboard, destDashboard);
            }
            return srcDashboard;
          });
        } else {
          // new group
          dest.push(srcGroup);
        }
      });
      for (let destIndex = dest.length - 1; destIndex >= 0; destIndex--) {
        const srcIndex = _.findIndex(src, { id: dest[destIndex].id });
        if (srcIndex === -1) {
          dest.splice(destIndex, 1);
        }
      }
    }

    getVisibleDashboardIds(dashboardIds) {
      // filter the given dashboardIds
      // to use only the selected/visible dashboard from each group
      return _(this.getGroups())
      .filter('selected')
      .filter(g => !dashboardIds || _.contains(dashboardIds, g.selected.id))
      .map('selected.id')
      .value();
    }

    setActiveGroupFromUrl() {
      const currentDashboardId = kibiState._getCurrentDashboardId();

      _.each(this.getGroups(), group => {
        group.active = false;
      });

      if (currentDashboardId) {
        const currentGroup = _.findWhere(this.getGroups(), { dashboards: [ { id: currentDashboardId } ] });
        currentGroup.active = true;
      }
    }

    _computeGroupsFromSavedDashboardGroups() {
      const self = this;

      // get all dashboard groups
      return savedDashboardGroups.find().then(function (respGroups) {
        if (!respGroups.hits) {
          return [];
        }
        // here first fetch all dashboards to be able to verify that dashboards mentioned in the group still exists
        return savedDashboards.find().then(function (respDashboards) {
          const dashboardGroups1 = [];
          let missingDashboardMsg = '';
          // first iterate over existing groups
          _.each(respGroups.hits, function (group) {

            const dashboardsArray = group.dashboards;
            // check that all dashboards still exists
            // in case there is one which does not display a warning
            _.each(dashboardsArray, function (d) {
              if (!_.find(respDashboards.hits, 'id', d.id)) {
                missingDashboardMsg = '"' + group.title + '"' + ' dashboard group contains non existing dashboard "' + d.id + '". ' +
                  'Edit dashboard group to remove non existing dashboard';
                return false;
              }
            });

            if (missingDashboardMsg) {
              return false;
            }

            // selected dashboard
            let selected;

            const dashboards = _.map(dashboardsArray, d => {
              return _getDashboardForGroup.call(self, group.id, group.title, _.find(respDashboards.hits, 'id', d.id));
            });

            // try to get the last selected one for this group
            if (dashboards.length > 0) {
              const lastSelectedId = kibiState.getSelectedDashboardId(group.id);
              selected = _.find(dashboards, 'id', lastSelectedId);
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

          if (missingDashboardMsg) {
            return Promise.reject(new MissingDashboardError(missingDashboardMsg));
          }

          return dashboardGroups1;
        });
      });
    }

    _addAdditionalGroupsFromSavedDashboards(dashboardGroups1) {
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
            const groupId = dashboardDef.id;
            const groupTitle = dashboardDef.title;
            const onlyOneDashboard = _getDashboardForGroup.call(self, groupId, groupTitle, dashboardDef);

            dashboardGroups1.push({
              virtual: true,
              id: groupId,
              title: groupTitle,
              dashboards: [ onlyOneDashboard ],
              selected: onlyOneDashboard,
              priority: dashboardDef.priority ? dashboardDef.priority : ++highestPriority
            });
          }
        });

        // only here we can fulfill the promise
        return dashboardGroups1;
      });
    }

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
    computeGroups(reason) {
      if (console) {
        console.log('Dashboard Groups will be recomputed because: [' + reason + ']'); // eslint-disable-line no-console
      }
      return this._computeGroupsFromSavedDashboardGroups()
      .then((dashboardGroups1) => this._addAdditionalGroupsFromSavedDashboards(dashboardGroups1))
      .then(groups => {
        this.groups = groups;
        return groups;
      });
    }
  }

  return new DashboardGroups();
});
