import { QueryBuilderFactory } from 'ui/kibi/helpers/query_builder';
import { DashboardHelperFactory } from 'ui/kibi/helpers/dashboard_helper';
import isJoinPruned from 'ui/kibi/helpers/is_join_pruned';
import _ from 'lodash';
import { SearchHelper } from 'ui/kibi/helpers/search_helper';
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
import { SimpleEmitter } from 'ui/utils/simple_emitter';
import { CacheProvider } from 'ui/kibi/helpers/cache_helper';
// kibi: these imports are needed for any third party plugin
import 'ui/filter_bar/join_explanation';
import 'ui/kibi/meta/kibi_meta';
// kibi: end

uiRoutes
.addSetupWork($injector => {
  if ($injector.has('kibiState')) {
    $injector.get('dashboardGroups').init();
  }
});

uiModules
.get('kibana')
.service('dashboardGroups', function (createNotifier, es, $timeout, kibiState, Private, savedDashboards,
                             savedDashboardGroups, Promise, kbnIndex, joinExplanation, getAppState, kibiMeta) {
  const notify = createNotifier();
  const dashboardHelper = Private(DashboardHelperFactory);
  const queryBuilder = Private(QueryBuilderFactory);
  const searchHelper = new SearchHelper(kbnIndex);
  let lastSelectDashboardEventTimer;
  const cache = Private(CacheProvider);

  const _getDashboardForGroup = function (groupTitle, dashboardDef) {
    return {
      id: dashboardDef.id,
      title: this._shortenDashboardName(groupTitle, dashboardDef.title),
      savedSearchId: dashboardDef.savedSearchId
    };
  };

  const _clearAllMeta = function (dashboard) {
    delete dashboard.count;
    delete dashboard.isPruned;
    delete dashboard.filterIconMessage;
    delete dashboard.dirty;
  };

  class DashboardGroups extends SimpleEmitter {
    constructor() {
      super();
      this.groups = [];
      this._initialized = false;
      this.init = _.once(() => {
        // NOTE: It is important to wait until appState is fully ready before doing the init
        // this prevents situations where appState was not ready yet
        // causing dashboard meta to be computed incorectly due to missing filters or queries
        const appStateReady = new Promise((fulfill, reject) => {
          const MAX = 500;
          let i = 0;
          let timer;
          const check = function () {
            const appState = getAppState();
            if (timer) {
              $timeout.cancel(timer);
            }
            if (appState) {
              // leaving this console log print to have an idea how long this takes on different systems
              if (console.debug) {
                console.debug('Got appState during dashboard_group service initailization after ' + (i * 10) + 'ms');
              }
              return fulfill();
            }
            if (++i > MAX) {
              return reject(new Error('Could not get appState during dashboard_group service initialization'));
            }
            timer = $timeout(check, 10);
          };
          check();
        });

        const groupsPromise = this.computeGroups('init');
        const metadataPromise = appStateReady.then(() => {
          return groupsPromise.then(groups => {
            const dashboardIds = _(groups)
            .filter(g => !g.collapsed || g.virtual)
            .map('dashboards')
            .flatten()
            .map('id')
            .value();
            return this.updateMetadataOfDashboardIds(dashboardIds);
          });
        });

        return Promise.all([ groupsPromise, metadataPromise ])
        .then(([ groups ]) => {
          this.groups = groups;
          this._initialized = true;
        });
      });
    }

    get isInitialized() {
      return this._initialized;
    }

    _dashboardMetadataCallback(dashboard, meta, filters, queries, dirty) {
      if (!_.contains(Object.keys(meta), 'error')) {
        dashboard.count = meta.hits.total;
      } else if (_.contains(Object.keys(meta), 'error') && meta.error.reason) {
        notify.error('Error: ' + meta.error.reason);
        dashboard.count = '';
      }
      dashboard.isPruned = isJoinPruned(meta);
      dashboard.dirty = dirty;
      return joinExplanation.constructFilterIconMessage(filters, queries)
      .then(filterIconMessage => {
        dashboard.filterIconMessage = filterIconMessage;
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

    newGroup(title = 'New group', iconCss = 'fa fa-folder-o') {
      return savedDashboardGroups.get().then(group => {
        let priority = 0;
        this.getGroups().forEach((group) => {
          priority = priority < group.priority ? group.priority : priority;
        });
        group.priority = priority + 10;
        group.title = title;
        group.iconCss = iconCss;
        return group.save();
      });
    }

    getDashboardsInGroup(groupId) {
      const group = _.find(this.getGroups(), 'id', groupId);
      return group.dashboards;
    }

    _getDashboardsMetadata(ids, forceCountsUpdate = false) {
      return savedDashboards.find()
      .then((resp) => {

        const dashboardIds = _(resp.hits)
        .filter(dashboard => dashboard.savedSearchId && _.contains(ids, dashboard.id))
        .pluck('id')
        .value();

        return kibiState.getStates(dashboardIds).then((results) => {
          // remap to an array
          const metadataPromises = [];
          for (const dashboardId in results) {
            if (results.hasOwnProperty(dashboardId)) {
              let p;
              const error = results[dashboardId].error;
              if (error) {
                p = Promise.resolve({
                  dashboardId: dashboardId,
                  filters: [],
                  queries: [],
                  indices: [],
                  indexPattern: null,
                  error: true
                });

              } else {
                const index = results[dashboardId].index;
                const filters = results[dashboardId].filters;
                const queries = results[dashboardId].queries;
                const time = results[dashboardId].time;
                const query = queryBuilder(filters, queries, time);
                const dashboard = _(resp.hits)
                  .filter(dashboard => dashboard.savedSearchId && dashboardId === dashboard.id).value() [0];
                const dirty = kibiState.dashboardHasModifiedFilters(dashboard);
                query.size = 0; // we do not need hits just a count
                p =  kibiState.timeBasedIndices(index, dashboardId)
                .then(indices => {
                  const optimizedQuery = searchHelper.optimize(indices, query, index);
                  return {
                    dashboardId,
                    query: optimizedQuery,
                    indexPattern: index,
                    filters,
                    queries,
                    indices,
                    dirty
                  };
                })
                .catch((error) => {
                  // If computing the indices failed because of an authorization error
                  // set indices to an empty array and mark the dashboard as forbidden.
                  if (error.status === 403 || error.statusCode === 403) {
                    const optimizedQuery = searchHelper.optimize([], query, index);
                    return {
                      dashboardId,
                      query: optimizedQuery,
                      indexPattern: index,
                      filters,
                      queries,
                      indices: [],
                      forbidden: true
                    };
                  }
                  throw error;
                });
              }
              metadataPromises.push(p);
            }
          }

          return Promise.all(metadataPromises);
        });
      });
    }

    updateMetadataOfDashboardIds(ids, forceCountsUpdate = false) {
      const self = this;
      if (console.debug) {
        const msg = `update metadata for following dashboards: ${JSON.stringify(ids, null, ' ')}`;
        console.debug(msg); // eslint-disable-line no-console
      }

      return this._getDashboardsMetadata(ids, forceCountsUpdate)
      .then(metadata => {

        const mapOfDashboardsRequestedButNoMetaFound = {};
        _.each(this.getGroups(), g => {
          _.each(g.dashboards, d => {
            if (ids.indexOf(d.id) !== -1 && !mapOfDashboardsRequestedButNoMetaFound[d.id]) {
              mapOfDashboardsRequestedButNoMetaFound[d.id] = d;
            }
          });
        });

        const metaDefinitions = [];
        _.each(this.getGroups(), g => {
          _.each(g.dashboards, d => {
            const foundDashboardMetadata = _.find(metadata, 'dashboardId', d.id);
            if (foundDashboardMetadata) {

              // remove every dashboard we found meta for
              if (mapOfDashboardsRequestedButNoMetaFound[d.id]) {
                delete mapOfDashboardsRequestedButNoMetaFound[d.id];
              }

              _clearAllMeta(d);

              metaDefinitions.push({
                definition: {
                  id: foundDashboardMetadata.dashboardId,
                  query: foundDashboardMetadata.query,
                },
                callback: function (error, meta) {
                  if (error) {
                    notify.error('Could not update metadata for dashboard ' + d.id, error);
                    return;
                  }
                  self._dashboardMetadataCallback(d, meta,
                    foundDashboardMetadata.filters, foundDashboardMetadata.queries, foundDashboardMetadata.dirty).then(() => {
                      self.emit('dashboardsMetadataUpdated', [d.id]);
                    });
                }
              });
            }
          });
        });

        // clear meta for all dashboards requested but for which we did not found meta
        _.each(mapOfDashboardsRequestedButNoMetaFound, (dashboard, id) => {
          _clearAllMeta(dashboard);
        });

        kibiMeta.getMetaForDashboards(metaDefinitions);
      });
    }

    getGroup(dashboardId) {
      if (!dashboardId) {
        throw new Error('Missing dashboard Id');
      }
      return _.find(this.getGroups(), group => _.find(group.dashboards, 'id', dashboardId));
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

    getTitlesOfDashboardGroupsTheseDashboardsBelongTo(dashboardIds) {
      return _(this.getGroups())
      // do not consider groups that were created programmatically
      .reject('virtual')
      // keep only the groups which dashboards contains some of the ids passed in argument
      .filter(group => _.intersection(dashboardIds, _.pluck(group.dashboards, 'id')).length)
      // return the title of the groups
      .map('title')
      .value();
    }

    selectDashboard(dashboardId) {
      $timeout.cancel(lastSelectDashboardEventTimer);

      const currentDashboardId = kibiState.getCurrentDashboardId();
      // only update meta if we stay on the same dashboard
      // in other cases the meta will be triggered by a watcher kibiState.getCurrentDashboardId
      const updateMeta = currentDashboardId === dashboardId ? true : false;

      // we need this timeout to allow ui event handler take place.
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
        return dashboardHelper.switchDashboard(dashboardId)
        .then(() => {
          if (updateMeta) {
            this.updateMetadataOfDashboardIds([ dashboardId ], true);
          }
        });
      }, 0);
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
        if (fromDash) {
          _.assign(dash, {
            count: fromDash.count,
            isPruned: fromDash.isPruned,
            dirty: fromDash.dirty,
            filterIconMessage: fromDash.filterIconMessage
          });
        }
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
      // to use only the visible dashboard
      return _(this.getGroups())
      .filter(g => !g.collapsed || g.virtual)
      .map('dashboards')
      .flatten()
      .filter(d => _.contains(dashboardIds, d.id))
      .map('id')
      .value();
    }

    setActiveGroupFromUrl() {
      const currentDashboardId = kibiState.getCurrentDashboardId();

      _.each(this.getGroups(), group => {
        group.active = false;
      });

      if (currentDashboardId) {
        const currentGroup = _.findWhere(this.getGroups(), { dashboards: [ { id: currentDashboardId } ] });
        if (currentGroup) {
          currentGroup.active = true;
        }
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
        return savedDashboards
        .find()
        .then(function (respDashboards) {
          const dashboardGroups1 = [];
          // first iterate over existing groups
          _.each(respGroups.hits, function (group) {

            // selected dashboard
            let selected;

            // ignore empty or non existing dashboard objects inside a dashboard group
            const dashboards = _.reduce(group.dashboards, (filtered, dashboard) => {
              if (dashboard && dashboard.id) {
                const savedDashboard = _.find(respDashboards.hits, 'id', dashboard.id);
                if (savedDashboard) {
                  filtered.push(_getDashboardForGroup.call(self, group.title, savedDashboard));
                }
              }
              return filtered;
            }, []);

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
            const onlyOneDashboard = _getDashboardForGroup.call(self, groupTitle, dashboardDef);

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
      if (console.debug) {
        console.debug('Dashboard Groups will be recomputed because: [' + reason + ']'); // eslint-disable-line no-console
      }
      return this._computeGroupsFromSavedDashboardGroups()
      .then(dashboardGroups1 => this._addAdditionalGroupsFromSavedDashboards(dashboardGroups1))
      .then(groups => {
        this.groups = groups;
        this.emit('groupsChanged');
        return groups;
      });
    }
  }

  return new DashboardGroups();
});
