import _ from 'lodash';
import { isEqual } from 'lodash';
import qs from 'ui/utils/query_string';
import { parseWithPrecision } from 'ui/kibi/utils/date_math_precision';
import uniqFilters from 'ui/filter_bar/lib/uniq_filters';
import { toJson } from 'ui/utils/aggressive_parse';
import angular from 'angular';
import { onManagementPage, onDashboardPage, onVisualizePage } from 'ui/kibi/utils/on_page';
import uiModules from 'ui/modules';
import uiRoutes from 'ui/routes';
import StateManagementStateProvider from 'ui/state_management/state';
import RelationsHelperProvider from 'ui/kibi/helpers/relations_helper';
import { getAppUrl, getBasePath } from 'ui/chrome';
import { IndexPatternMissingIndices } from 'ui/errors';

function KibiStateProvider(savedSearches, timefilter, $route, Promise, getAppState, savedDashboards, $rootScope, indexPatterns, globalState,
    elasticsearchPlugins, $location, config, Private, createNotifier) {
  const State = Private(StateManagementStateProvider);
  const notify = createNotifier({ location: 'Kibi State' });
  const relationsHelper = Private(RelationsHelperProvider);
  const decorateQuery = Private(require('ui/courier/data_source/_decorate_query'));

  _.class(KibiState).inherits(State);
  function KibiState(defaults) {
    KibiState.Super.call(this, '_k', defaults);

    this.init = _.once(function () {
      // do not try to initialize the kibistate if it was already done via the URL
      if (_.size(this.toObject())) {
        return;
      }
      return savedDashboards.find().then((resp) => {
        if (resp.hits) {
          _.each(resp.hits, (dashboard) => {
            const meta = JSON.parse(dashboard.kibanaSavedObjectMeta.searchSourceJSON);
            let filters = _.reject(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
            const query = _.find(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);

            // query
            if (query && query.query && !this._isDefaultQuery(query.query)) {
              this._setDashboardProperty(dashboard.id, this._properties.query, query.query);
            }
            // filters
            // remove private fields like $state
            filters = JSON.parse(toJson(filters, angular.toJson));
            if (filters && filters.length) {
              this._setDashboardProperty(dashboard.id, this._properties.filters, filters);
            }
            // time
            if (dashboard.timeRestore && dashboard.timeFrom && dashboard.timeTo) {
              this._saveTimeForDashboardId(dashboard.id, dashboard.timeMode, dashboard.timeFrom, dashboard.timeTo);
            }
          });

          this.save(true, true);
        }
      }).catch(notify.error);
    });
  }

  /**
   * isFilterOutdated returns true if the given filter uses an outdated API
   */
  KibiState.prototype.isFilterOutdated = function (filter) {
    return filter && filter.join_sequence && !filter.meta.version;
  };

  /**
   * disableFiltersIfOutdated disables filters which rely on outdated API and warns the user about it.
   *
   * @param filters a list of filters
   * @param dashboardId the dashboard ID on which the filters are
   */
  KibiState.prototype.disableFiltersIfOutdated = function (filters, dashboardId) {
    const appState = getAppState();

    if (!dashboardId) {
      throw new Error('disableFiltersIfOutdated called without a dashboardId');
    }
    _.each(filters, filter => {
      if (this.isFilterOutdated(filter)) {
        let message;

        if (dashboardId === this._getCurrentDashboardId() && appState && !_.findWhere(appState.filters, filter)) {
          // the filter is not in the appState, the KibiState is then dirty
          message = `The Kibi state contains filters that rely on outdated API. Please clean it, either by going to ${getAppUrl()},
            or by switching to another dashboard.`;
        } else {
          message = `The join filter "${filter.meta.alias}" on dashboard with ID="${dashboardId}" is invalid ` +
            'because it relies on outdated API. Please remove it.';
        }
        message += ` If the filter keeps on coming back, then it may be saved with the dashboard with ID="${dashboardId}"`;
        notify.warning(message);

        filter.meta.disabled = true;
      }
    });
  };

  // if the url param is missing, write it back
  KibiState.prototype._persistAcrossApps = true;

  KibiState.prototype.removeFromUrl = function (url) {
    return qs.replaceParamInUrl(url, this._urlParam, null);
  };

  /**
   * Returns true if the query is:
   * - a query_string
   * - a wildcard only
   * - analyze_wildcard is set to true
   */
  KibiState.prototype._isDefaultQuery = function (query) {
    const defaultQuery = decorateQuery({
      query_string: {
        query: '*'
      }
    });
    return isEqual(query, defaultQuery);
  };

  /**
   * Returns true if the given time is the one from timepicker:timeDefaults
   */
  KibiState.prototype._isDefaultTime = function (mode, from, to) {
    const timeDefaults = config.get('timepicker:timeDefaults');
    return mode === timeDefaults.mode && from === timeDefaults.from && to === timeDefaults.to;
  };

  /**
   * Saves the given time to the kibistate
   */
  KibiState.prototype._saveTimeForDashboardId = function (dashboardId, mode, from, to) {
    let toStr = to;
    let fromStr = from;

    if (typeof from === 'object') {
      fromStr = from.toISOString();
    }
    if (typeof to === 'object') {
      toStr = to.toISOString();
    }
    const oldTime = this._getDashboardProperty(dashboardId, this._properties.time);
    const changed = this._setDashboardProperty(dashboardId, this._properties.time, {
      m: mode,
      f: fromStr,
      t: toStr
    });
    if (changed && this._getCurrentDashboardId() !== dashboardId) {
      // do not emit the event if the time changed is for the current dashboard since this is taken care of by the globalState
      const newTime = this._getDashboardProperty(dashboardId, this._properties.time);
      this.emit('time', dashboardId, newTime, oldTime);
    }
    return changed;
  };

  /**
   * Shortcuts for properties in the kibistate
   */
  KibiState.prototype._properties = {
    // dashboards properties
    filters: 'f',
    query: 'q',
    time: 't',
    synced_dashboards: 's',
    // properties available in the diff array with the save_with_changes event
    dashboards: 'd',
    enabled_relations: 'j',
    enabled_relational_panel: 'e',
    groups: 'g',
    // selected entity properties
    selected_entity_disabled: 'x',
    selected_entity: 'u',
    test_selected_entity: 'v'
  };

  /**
   * setSyncedDashboards sets the given dashboard IDs to sync the time with the given dashboard.
   */
  KibiState.prototype.setSyncedDashboards = function (dashboardId, dashboards) {
    if (dashboards && dashboards.length) {
      this._setDashboardProperty(dashboardId, this._properties.synced_dashboards, dashboards);
    } else {
      this._deleteDashboardProperty(dashboardId, this._properties.synced_dashboards);
    }
  };

  /**
   * getSyncedDashboards returns the IDs of dashboards to sync the time with.
   */
  KibiState.prototype.getSyncedDashboards = function (dashboardId) {
    return this._getDashboardProperty(dashboardId, this._properties.synced_dashboards);
  };

  KibiState.prototype.isEntitySelected = function (index, type, id, column) {
    const entityURI = this.getEntityURI();
    if (!entityURI || !index || !type || !id || !column) {
      return false;
    }
    return entityURI.index === index && entityURI.type === type && entityURI.id === id && entityURI.column === column;
  };

  KibiState.prototype.setEntityURI = function ({ index, type, id, column } = {}) {
    if (onDashboardPage()) {
      if (!id) {
        delete this[this._properties.selected_entity];
      } else {
        this[this._properties.selected_entity] = { index, type, id, column };
      }
    } else if (onVisualizePage() || onManagementPage()) {
      if (!id) {
        delete this[this._properties.test_selected_entity];
      } else {
        this[this._properties.test_selected_entity] = { index, type, id, column };
      }
    } else {
      throw new Error('Cannot set entity URI because you are not on dashboard/visualize/management');
    }
  };

  KibiState.prototype.getEntityURI = function () {
    if (onDashboardPage()) {
      return this[this._properties.selected_entity];
    } else if (onVisualizePage() || onManagementPage()) {
      return this[this._properties.test_selected_entity];
    }
    throw new Error('Cannot get entity URI because you are not on dashboard/visualize/management');
  };

  KibiState.prototype.isSelectedEntityDisabled = function () {
    return Boolean(this[this._properties.selected_entity_disabled]);
  };

  KibiState.prototype.disableSelectedEntity = function (disable) {
    if (disable) {
      this[this._properties.selected_entity_disabled] = disable;
    } else {
      delete this[this._properties.selected_entity_disabled];
    }
  };

  KibiState.prototype.removeTestEntityURI = function () {
    delete this[this._properties.test_selected_entity];
  };

  /**
   * Reset the filters, queries, and time for each dashboard to their saved state.
   */
  KibiState.prototype.resetFiltersQueriesTimes = function (dashId) {
    if (!dashId) {
      if (globalState.filters && globalState.filters.length) {
        // remove pinned filters
        globalState.filters = [];
        globalState.save();
      }
    }
    return savedDashboards.find().then((resp) => {
      if (resp.hits) {
        const dashboardIdsToUpdate = [];
        const appState = getAppState();
        const timeDefaults = config.get('timepicker:timeDefaults');

        if (dashId) {
          resp.hits = _(resp.hits).filter(d => d.id === dashId).value();
        }

        _.each(resp.hits, (dashboard) => {
          const meta = JSON.parse(dashboard.kibanaSavedObjectMeta.searchSourceJSON);
          const filters = _.reject(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
          const query = _.find(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);

          this.disableFiltersIfOutdated(filters, dashboard.id);
          // reset appstate
          if (appState && dashboard.id === appState.id) {
            let queryChanged = false;
            // filters
            appState.filters = filters;

            // query
            const origQuery = query && query.query || { query_string: { analyze_wildcard: true, query: '*' } };
            if (!angular.equals(origQuery, appState.query)) {
              queryChanged = true;
            }
            appState.query = origQuery;

            // time
            if (dashboard.timeRestore && dashboard.timeFrom && dashboard.timeTo) {
              timefilter.time.mode = dashboard.timeMode;
              timefilter.time.to = dashboard.timeTo;
              timefilter.time.from = dashboard.timeFrom;
            } else {
              // These can be date math strings or moments.
              timefilter.time = timeDefaults;
            }
            if (queryChanged) {
              // this will save the appstate and update the current searchsource
              // This is only needed for changes on query, since the query needs to be added to the searchsource
              this.emit('reset_app_state_query');
            } else {
              appState.save();
            }
          }

          // reset kibistate
          let modified = false;
          if (this[this._properties.dashboards] && this[this._properties.dashboards][dashboard.id]) {
            // query
            if (!query || this._isDefaultQuery(query.query)) {
              if (this._getDashboardProperty(dashboard.id, this._properties.query)) {
                // kibistate has a query that will be removed with the reset
                modified = true;
              }
              this._deleteDashboardProperty(dashboard.id, this._properties.query);
            } else {
              if (this._setDashboardProperty(dashboard.id, this._properties.query, query.query)) {
                modified = true;
              }
            }

            // filters
            if (filters.length) {
              if (this._setDashboardProperty(dashboard.id, this._properties.filters, filters)) {
                modified = true;
              }
            } else {
              if (this._getDashboardProperty(dashboard.id, this._properties.filters)) {
                // kibistate has filters that will be removed with the reset
                modified = true;
              }
              this._deleteDashboardProperty(dashboard.id, this._properties.filters);
            }

            // time
            if (dashboard.timeRestore && dashboard.timeFrom && dashboard.timeTo) {
              if (this._saveTimeForDashboardId(dashboard.id, dashboard.timeMode, dashboard.timeFrom, dashboard.timeTo)) {
                modified = true;
              }
            } else {
              if (this._getDashboardProperty(dashboard.id, this._properties.time)) {
                // kibistate has a time that will be removed with the reset
                modified = true;
              }
              this._deleteDashboardProperty(dashboard.id, this._properties.time);
            }
          }
          if (modified) {
            dashboardIdsToUpdate.push(dashboard.id);
          }
        });

        // add the ID of dashboards that are joined
        _.each(this.getEnabledRelations(), (relation) => {
          _.each(relation.dashboards, (dashboardId) => {
            if (dashboardIdsToUpdate.indexOf(dashboardId) === -1) {
              dashboardIdsToUpdate.push(dashboardId);
            }
          });
        });

        if (!dashId) {
          this.disableAllRelations();
          // but enable the relational panel in case it was disabled by a filter
          this.toggleRelationalPanel(true);
        }

        if (dashboardIdsToUpdate.length) {
          this.emit('reset', dashboardIdsToUpdate);
        }
        this.save();
      }
    });

    return Promise.resolve();
  };

  KibiState.prototype.getSelectedDashboardId = function (groupId) {
    if (this[this._properties.groups]) {
      return this[this._properties.groups][groupId];
    }
    return null;
  };

  KibiState.prototype.setSelectedDashboardId = function (groupId, dashboardId) {
    if (!this[this._properties.groups]) {
      this[this._properties.groups] = {};
    }
    this[this._properties.groups][groupId] = dashboardId;
  };

  KibiState.prototype.addFilter = function (dashboardId, filter) {
    const filters = this._getDashboardProperty(dashboardId, this._properties.filters) || [];
    filters.push(filter);
    this._setDashboardProperty(dashboardId, this._properties.filters, uniqFilters(filters));
  };

  /**
   * Sets a property-value pair for the given dashboard
   *
   * @param dashboardId the ID of the dashboard
   * @param prop the property name
   * @param value the value to set
   * @returns boolean true if the property changed
   */
  KibiState.prototype._setDashboardProperty = function (dashboardId, prop, value) {
    if (!this[this._properties.dashboards]) {
      this[this._properties.dashboards] = {};
    }
    if (!this[this._properties.dashboards][dashboardId]) {
      this[this._properties.dashboards][dashboardId] = {};
    }
    const changed = !angular.equals(this[this._properties.dashboards][dashboardId][prop], value);
    this[this._properties.dashboards][dashboardId][prop] = value;
    return changed;
  };

  /**
   * Gets a property-value pair for the given dashboard
   */
  KibiState.prototype._getDashboardProperty = function (dashboardId, prop) {
    if (!this[this._properties.dashboards] || !this[this._properties.dashboards][dashboardId]) {
      return;
    }
    return this[this._properties.dashboards][dashboardId][prop];
  };

  /**
   * Delets the property from the dashboards object in the kibistate
   */
  KibiState.prototype._deleteDashboardProperty = function (dashboardId, prop) {
    if (!this[this._properties.dashboards] || !this[this._properties.dashboards][dashboardId]) {
      return;
    }
    delete this[this._properties.dashboards][dashboardId][prop];
    // check if this was the last and only
    // if yes delete the whole dashboard object
    if (Object.keys(this[this._properties.dashboards][dashboardId]).length === 0) {
      delete this[this._properties.dashboards][dashboardId];
    }
  };

  /**
   * Returns the current dashboard
   */
  KibiState.prototype._getCurrentDashboardId = function () {
    const dash = _.get($route, 'current.locals.dash');

    if (!dash || dash.locked) {
      return;
    }
    return dash.id;
  };

  /**
   * For each dashboard id in the argument, return a promise with the saved dashboard and associated saved search meta.
   * If dashboardIds is undefined, all dashboards are returned.
   *
   * @param dashboardIds array list of dashboard ids
   * @param failOnMissingMeta boolean if true then an unknown saved search will fail, otherwise a notification is printed and it is skipped
   * @returns Promise array of dashboard and search pairs
   */
  KibiState.prototype._getDashboardAndSavedSearchMetas = function (dashboardIds, failOnMissingMeta = true) {
    const getAllDashboards = !dashboardIds;

    dashboardIds = _.compact(dashboardIds);

    // use find to minimize number of requests
    return Promise.all([ savedSearches.find(), savedDashboards.find() ])
    .then(([ savedSearchesRes, savedDashboardsRes ]) => {
      const errors = [];
      const savedDashboardsAndsavedMetas = _(savedDashboardsRes.hits)
      // keep the dashboards that are in the array passed as argument
      .filter((savedDash) => getAllDashboards || _.contains(dashboardIds, savedDash.id))
      .tap(savedDashMetas => {
        if (!getAllDashboards && savedDashMetas.length !== dashboardIds.length) {
          errors.push(`Unable to retrieve dashboards: ${_.difference(dashboardIds, _.pluck(savedDashMetas, 'id'))}.`);
        }
      })
      .map((savedDash) => {
        const savedSearch = _.find(savedSearchesRes.hits, (hit) => hit.id === savedDash.savedSearchId);
        const savedSearchMeta = savedSearch ? JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON) : null;
        return { savedDash, savedSearchMeta };
      })
      .sortBy(({ savedDash }) => {
        if (dashboardIds && dashboardIds.length > 0) {
          // here we need to sort the results based on dashboardIds order
          return dashboardIds.indexOf(savedDash.id);
        }
      })
      .filter(({ savedSearchMeta, savedDash }) => {
        if (!savedSearchMeta && savedDash.savedSearchId) {
          errors.push(`The dashboard [${savedDash.title}] is associated with an unknown saved search.
            It may have been removed or you do not have the rights to access it.`);
          return false;
        }
        return true;
      })
      .value();

      if (errors.length) {
        if (failOnMissingMeta) {
          return Promise.reject(new Error(errors[0])); // take the first error
        } else {
          // notify of all errors
          for (const error of errors) {
            notify.warning(error);
          }
        }
      }

      return savedDashboardsAndsavedMetas;
    });
  };

  /**
   * Copied from 'ui/filter_bar/query_filter'.
   * Rids filter list of null values and replaces state if any nulls are found.
   * Work around for https://github.com/elastic/kibana/issues/5896.
   */
  function validateStateFilters(state) {
    if (!state.filters) {
      return [];
    }
    const compacted = _.compact(state.filters);
    if (state.filters.length !== compacted.length) {
      state.filters = compacted;
      state.replace();
    }
    return state.filters;
  }

  /**
   * Returns the current set of filters for the given dashboard.
   * If pinned is true, then the pinned filters are added to the returned array.
   * If disabled is true, then the disabled filters are added to the returned array.
   */
  KibiState.prototype._getFilters = function (dashboardId, appState, metas, { pinned, disabled }) {
    let filters;

    if (appState && this._getCurrentDashboardId() === dashboardId) {
      filters = _.cloneDeep(validateStateFilters(appState));
    } else {
      const kibiStateFilters = this._getDashboardProperty(dashboardId, this._properties.filters);
      filters = kibiStateFilters && _.cloneDeep(kibiStateFilters) || [];
    }

    if (pinned) {
      filters.push(..._.map(validateStateFilters(globalState), (f) => _.omit(f, ['$state', '$$hashKey'])));
    }

    // get the filters from the search meta
    if (metas && metas.savedDash && metas.savedDash.id !== dashboardId) {
      const msg = `Something wrong occurred, got dashboard=${dashboardId} but meta is from dashboard=${metas.savedDash.id}`;
      return Promise.resolve(new Error(msg));
    }
    const smFilters = metas && metas.savedSearchMeta && metas.savedSearchMeta.filter;
    if (smFilters) {
      _.each(smFilters, filter => {
        filter.meta.fromSavedSearch = true;
      });
      filters.push(...smFilters);
    }
    // remove disabled filters
    if (!disabled) {
      filters = _.filter(filters, (f) => f.meta && !f.meta.disabled);
    }
    // remove join_set filter since it is computed only if needed.
    // It may be available through the appState.filters
    _.remove(filters, (filter) => filter.join_set);
    return Promise.resolve(uniqFilters(filters, { state: true, negate: true, disabled: true }));
  };

  /**
   * Returns the current set of queries for the given dashboard
   */
  KibiState.prototype._getQueries = function (dashboardId, appState, metas) {
    let query = decorateQuery({
      query_string: {
        query: '*'
      }
    });

    if (appState && this._getCurrentDashboardId() === dashboardId) {
      if (appState.query) {
        query = _.cloneDeep(appState.query);
      }
    } else {
      const q = this._getDashboardProperty(dashboardId, this._properties.query);
      if (q) {
        query = _.cloneDeep(q);
      }
    }

    // get the query from the search meta
    if (metas && metas.savedDash && metas.savedDash.id !== dashboardId) {
      const msg = `Something wrong occurred, got dashboard=${dashboardId} but meta is from dashboard=${metas.savedDash.id}`;
      return Promise.resolve(new Error(msg));
    }
    const smQuery = metas && metas.savedSearchMeta && metas.savedSearchMeta.query;
    if (smQuery && !_.isEqual(smQuery, query) && !this._isDefaultQuery(smQuery)) {
      return Promise.resolve([ query, smQuery ]);
    }
    return Promise.resolve([ query ]);
  };

  /**
   * Returns the current time for the given dashboard
   */
  KibiState.prototype._getTime = function (dashboardId, index) {
    if (!index) {
      // do not reject - just return null
      // rejecting in this method would brake the Promise.all
      return null;
    }

    const timeDefaults = config.get('timepicker:timeDefaults');
    const time = {
      mode: timeDefaults.mode,
      from: timeDefaults.from,
      to: timeDefaults.to
    };

    if (dashboardId === this._getCurrentDashboardId()) {
      time.mode = timefilter.time.mode;
      time.from = timefilter.time.from;
      time.to = timefilter.time.to;
    } else {
      const t = this._getDashboardProperty(dashboardId, this._properties.time);
      if (t) {
        time.mode = t.m;
        time.from = t.f;
        time.to = t.t;
      }
    }

    return indexPatterns.get(index)
    .then((indexPattern) => {
      let filter;
      const timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, { name: indexPattern.timeFieldName });

      if (timefield) {
        filter = {
          range : {
            [timefield.name]: {
              gte: parseWithPrecision(time.from, false, $rootScope.kibiTimePrecision).valueOf(),
              lte: parseWithPrecision(time.to, true, $rootScope.kibiTimePrecision).valueOf(),
              format: 'epoch_millis'
            }
          }
        };
      }

      return filter;
    })
    .catch((error) => {
      // if the pattern does not match any index, do not break Promise.all and return a null filter.
      if (error instanceof IndexPatternMissingIndices) {
        return null;
      }
      throw error;
    });
  };

  /**
   * Taken from timefilter.getBounds
   */
  KibiState.prototype.getTimeBounds = function (dashboardId) {
    if (!dashboardId) {
      throw new Error('KibiState.getTimeBounds cannot be called with missing dashboard ID');
    }

    const timeDefaults = config.get('timepicker:timeDefaults');
    let timeFrom = timeDefaults.from;
    let timeTo = timeDefaults.to;

    if (dashboardId === this._getCurrentDashboardId()) {
      timeFrom = timefilter.time.from;
      timeTo = timefilter.time.to;
    } else {
      const t = this._getDashboardProperty(dashboardId, this._properties.time);
      if (t) {
        timeFrom = t.f;
        timeTo = t.t;
      }
    }

    return {
      min: parseWithPrecision(timeFrom, false, $rootScope.kibiTimePrecision),
      max: parseWithPrecision(timeTo, true, $rootScope.kibiTimePrecision)
    };
  };

  /**
   * timeBasedIndices returns an array of time-expanded indices for the given pattern. The time range is the one taken from
   * the kibi state. If the index is not time-based, then an array of the given pattern is returned.
   * If the intersection of time-ranges from the given dashboards is empty, then an empty array is returned.
   *
   * @param indexPatternId the pattern to expand
   * @param dashboardIds the ids of dashboard to take a time-range from
   * @returns an array of indices name
   */
  KibiState.prototype.timeBasedIndices = function (indexPatternId, ...dashboardIds) {
    if (indexPatternId === null) {
      return Promise.resolve([]);
    }
    return indexPatterns.get(indexPatternId)
    .then((pattern) => {
      if (pattern.hasTimeField()) {
        const { min, max } = _.reduce(dashboardIds, (acc, dashboardId) => {
          const { min, max } = this.getTimeBounds(dashboardId);
          if (!acc.min || acc.min.isBefore(min)) {
            acc.min = min;
          }
          if (!acc.max || acc.max.isAfter(max)) {
            acc.max = max;
          }
          return acc;
        }, {});
        if (min.isAfter(max)) {
          // empty intersection of time ranges
          return [];
        }
        return pattern.toIndexList(min, max);
      }
      return [ indexPatternId ];
    })
    .catch((error) => {
      // If computing the indices failed because the pattern does not match any index return an empty list.
      if (error instanceof IndexPatternMissingIndices) {
        return [];
      }
      throw error;
    });
  };

  /**
   * Returns all dashboard ids which are connected to given dashboard id via relations enabled in relational panel
   */
  KibiState.prototype.addAllConnected = function (dashboardId) {
    const connected = this._getDashboardsIdInConnectedComponent(dashboardId, this.getEnabledRelations());
    return connected.length > 0 ? connected : [dashboardId];
  };

  /**
   * Returns the set of dashboard IDs which are connected to the focused dashboard, i.e., the connected component of the graph.
   * Relations is the array of relations between dashboards.
   */
  KibiState.prototype._getDashboardsIdInConnectedComponent = function (focus, relations) {
    // check in the focus dashbaord is in a relation
    let isInARelation = false;
    for (let i = 0; i < relations.length; i++) {
      const relation = relations[i];
      if (focus === relation.dashboards[0] || focus === relation.dashboards[1]) {
        isInARelation = true;
        break;
      }
    }
    if (!isInARelation) {
      return [];
    }

    const labels = [];

    // the set of current nodes to visit
    const current = [ focus ];
    // the set of nodes to visit in the next iteration
    const toVisit = [];
    // the set of visited nodes
    const visited = [];

    do {

      // for each relation:
      // - if some node is in the current ones, then add the adjacent
      // node to toVisit if it was not visited already
      for (let i = 0; i < relations.length; i++) {
        const relation = relations[i];
        let ind = -1;
        let label = '';

        if ((ind = current.indexOf(relation.dashboards[0])) !== -1) {
          label = relation.dashboards[1];
        } else if ((ind = current.indexOf(relation.dashboards[1])) !== -1) {
          label = relation.dashboards[0];
        }

        // only visit that dashboard if
        // - it is not part of a loop
        // - if it was not already visited
        // - if it will not be visited in the next iteration
        if (label && label !== current[ind] && visited.indexOf(label) === -1 && toVisit.indexOf(label) === -1) {
          toVisit.push(label);
        }
      }

      // update the visisted set
      for (let j = current.length - 1; j >= 0; j--) {
        labels.push(current[j]);
        visited.push(current.pop());
      }
      // update the current set
      for (let k = toVisit.length - 1; k >= 0; k--) {
        current.push(toVisit.pop());
      }

    } while (current.length !== 0);

    return labels;
  };

  KibiState.prototype._readFromURL = function () {
    const stash = KibiState.Super.prototype._readFromURL.call(this);

    if (stash) {
      // check the enabled relations
      if (stash[this._properties.enabled_relations] && stash[this._properties.enabled_relations].length) {
        const enableRelations = stash[this._properties.enabled_relations];
        for (let i = enableRelations.length - 1; i >= 0; i--) {
          if (!relationsHelper.validateDashboardsRelation(enableRelations[i])) {
            const [ deleted ] = enableRelations.splice(i, 1);
            notify.warning(
              `Removed relation between dashboards ${deleted.dashboards[0]} and ${deleted.dashboards[1]} because it was invalid`
            );
          }
        }
      }
      // check the join_sequence
      _.each(stash[this._properties.dashboards], (meta, dashboardId) => {
        this.disableFiltersIfOutdated(meta[this._properties.filters], dashboardId);
      });
    }
    return stash;
  };

  /**
   * Build the relations for the join_set query
   *
   * @param focusIndex the index ID at the root of the filterjoin query
   * @param filterAlias the alias for the filter
   * @param metas the saved objects (search + dashboard) for each dashboard
   * @param rest the filters, queries and times for all dashboards but the focused one
   * @returns a join_set query
   */
  KibiState.prototype._getJoinSetFilter = function (focusIndex, filterAlias, metas, rest) {
    const dashboardIdsAndIndexPattern = new Map();
    const queriesPerIndexAndPerDashboard = {};

    /*
     * Get the filters/queries/times
     */
    const addObject = function (container, thatIndex, thatDashbaord, array) {
      if (!container[thatIndex]) {
        container[thatIndex] = {};
      }
      if (!container[thatIndex][thatDashbaord]) {
        container[thatIndex][thatDashbaord] = [];
      }
      if (array) {
        container[thatIndex][thatDashbaord].push(...array);
      }
    };

    const cleanFilter = function (fFilter) {
      // clone it first so when we remove meta the original object is not modified
      let filter = _.cloneDeep(fFilter);
      delete filter.$state;
      if (filter.meta) {
        const negate = filter.meta.negate;
        delete filter.meta;
        if (negate) {
          filter = {
            not: filter
          };
        }
      }
      return filter;
    };

    for (let i = 0, j = 1; i < rest.length; i += 3, j++) {
      const thatIndex = metas[j].savedSearchMeta.index;
      const thatDashboardId = metas[j].savedDash.id;
      const thatDashboardTitle = metas[j].savedDash.title;

      // ids of relevant dashboard
      if (!dashboardIdsAndIndexPattern.has(thatIndex)) {
        dashboardIdsAndIndexPattern.set(thatIndex, []);
      }
      dashboardIdsAndIndexPattern.get(thatIndex).push(thatDashboardId);

      // queries
      const queries = _.filter(rest[i + 1], q => q && !this._isDefaultQuery(q)); // filter out default queries
      addObject(queriesPerIndexAndPerDashboard, thatIndex, thatDashboardTitle, queries);

      // filters
      const filters = _.map(rest[i], cleanFilter.bind(this));
      addObject(queriesPerIndexAndPerDashboard, thatIndex, thatDashboardTitle, filters);

      // times
      const time = rest[i + 2];
      addObject(queriesPerIndexAndPerDashboard, thatIndex, thatDashboardTitle, time && [ time ] || []);
    }

    /*
     * get the relations
     */
    const relations = _.map(this.getEnabledRelations(), (r) => {
      const relationMeta = relationsHelper.getRelationInfosFromRelationID(r.relation);

      const sourceIndex = relationMeta.source.index;
      const targetIndex = relationMeta.target.index;

      const relation = [
        {
          pattern: sourceIndex,
          path: relationMeta.source.path
        },
        {
          pattern: targetIndex,
          path: relationMeta.target.path
        }
      ];

      if (relationMeta.source.type) {
        relation[0].types = [ relationMeta.source.type ];
      }
      if (relationMeta.target.type) {
        relation[1].types = [ relationMeta.target.type ];
      }

      relationsHelper.addAdvancedJoinSettingsToRelation(relation, relationMeta.source.index, relationMeta.target.index);

      return Promise.all([
        sourceIndex !== focusIndex && dashboardIdsAndIndexPattern.has(sourceIndex) &&
          this.timeBasedIndices(sourceIndex, ...dashboardIdsAndIndexPattern.get(sourceIndex)) || [],
        targetIndex !== focusIndex && dashboardIdsAndIndexPattern.has(targetIndex) &&
          this.timeBasedIndices(targetIndex, ...dashboardIdsAndIndexPattern.get(targetIndex)) || []
      ]).then(([ sourceIndices, targetIndices ]) => {
        relation[0].indices = sourceIndices;
        relation[1].indices = targetIndices;
        return relation;
      });
    });

    /*
     * build the join_set filter
     */
    return Promise.all(relations)
    .then(relations => {
      return {
        meta: {
          alias: filterAlias,
          disabled: !this.isRelationalPanelEnabled()
        },
        join_set: {
          focus: focusIndex,
          relations: relations,
          queries: queriesPerIndexAndPerDashboard
        }
      };
    });
  };

  /**
   * Returns an array of dashboard IDs.
   * WARNING: this method returns only the ID of dashboards that have some state, e.g., some filters.
   */
  KibiState.prototype.getAllDashboardIDs = function () {
    return _.keys(this[this._properties.dashboards]);
  };

  /**
   * Returns the current state of the dashboard with given ID
   */
  KibiState.prototype.getState = function (dashboardId) {
    if (!dashboardId) {
      return Promise.reject(new Error('Missing dashboard ID'));
    }

    const options = {
      pinned: true,
      disabled: false
    };

    const dashboardIds = [ dashboardId ];
    if (this.isRelationalPanelButtonEnabled()) {
      // collect ids of dashboards from enabled relations and in the connected component to dashboardId
      const tmpDashboardIds = this._getDashboardsIdInConnectedComponent(dashboardId, this.getEnabledRelations());

      if (tmpDashboardIds.indexOf(dashboardId) !== -1) { // focused dashboard is part of enabled relation
        _.each(tmpDashboardIds, (d) => {
          if (d !== dashboardId) {
            dashboardIds.push(d);
          }
        });
      }
    }

    const appState = getAppState();

    if (!dashboardIds.length) {
      const msg = `Dashboards ${JSON.stringify(dashboardIds)} are not saved. It needs to be for one of the visualizations.`;
      return Promise.reject(new Error(msg));
    }

    // here ignore the missing meta as getState can be called
    // on a dashboard without associated savedSearch
    const getMetas = this._getDashboardAndSavedSearchMetas(dashboardIds);

    // check siren-vanguard plugin
    if (this.isRelationalPanelButtonEnabled() && !this.isSirenJoinPluginInstalled()) {
      const error = 'The Siren Vanguard plugin is enabled but not installed. Please install the plugin and restart Kibi, ' +
        'or disable the relational panel in Management / Relations';
      return Promise.reject(new Error(error));
    }

    return getMetas
    .then((metas) => {
      const promises = [];

      // extra check for metas
      // if dashboardIds is empty or contains only 1 element
      //   - the meta can be missing
      // else
      //   - each dashboard must have corresponding meta as these mean that we are passing
      //   set of relationally connected dashboards
      if (dashboardIds.length > 1) {
        for (let i = 0; i < metas.length; i++) {
          if (!metas[i].savedSearchMeta) {
            const error = `The dashboard [${metas[i].savedDash.title}] is expected to be associated with a saved search.`;
            return Promise.reject(new Error(error));
          }
        }
      }

      for (let i = 0; i < metas.length; i++) {
        const meta = metas[i];
        promises.push(this._getFilters(meta.savedDash.id, appState, meta, options));
        promises.push(this._getQueries(meta.savedDash.id, appState, meta));
        promises.push(this._getTime(meta.savedDash.id, meta.savedSearchMeta ? meta.savedSearchMeta.index : null));
      }
      return Promise.all(promises)
      .then(([ filters, queries, time, ...rest ]) => {
        const index = metas[0].savedSearchMeta ? metas[0].savedSearchMeta.index : null;

        if (rest.length) { // Build the join_set filter
          const filterAlias = _(dashboardIds).map((dashboardId, ind) => metas[ind].savedDash.title).sortBy().join(' \u2194 ');
          return this._getJoinSetFilter(index, filterAlias, metas, rest)
          .then(joinSetFilter => {
            const existingJoinSetFilterIndex = _.findIndex(filters, (filter) => filter.join_set);
            if (existingJoinSetFilterIndex !== -1) {
              filters.splice(existingJoinSetFilterIndex, 1, joinSetFilter);
            } else {
              filters.push(joinSetFilter);
            }
            return { index, filters, queries, time };
          });
        }
        return { index, filters, queries, time };
      });
    });
  };

  /**
   * Saves the AppState to the KibiState
   */
  KibiState.prototype.saveAppState = function () {
    const currentDashboardId = this._getCurrentDashboardId();
    const appState = getAppState();
    const options = {
      pinned: false,
      disabled: true
    };

    if (!appState || !currentDashboardId) {
      return Promise.resolve(false);
    }
    return Promise.all([
      this._getFilters(currentDashboardId, appState, null, options),
      this._getQueries(currentDashboardId, appState, null),
      savedDashboards.find()
    ])
    .then(([ filters, queries, savedDashboardsRes ]) => {
      const savedDash = _.find(savedDashboardsRes.hits, (hit) => hit.id === currentDashboardId);
      if (!savedDash) {
        return Promise.reject(new Error(`Unable to get saved dashboard [${currentDashboardId}]`));
      }
      const meta = JSON.parse(savedDash.kibanaSavedObjectMeta.searchSourceJSON);
      const dashFilters = _.reject(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
      const dashQuery = _.find(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);

      // save filters
      const existingJoinSetFilterIndex = _.findIndex(filters, (filter) => filter.join_set);
      if (existingJoinSetFilterIndex !== -1) {
        filters.splice(existingJoinSetFilterIndex, 1);
      }
      // remove private fields like $state
      filters = JSON.parse(toJson(filters, angular.toJson));
      if (!_.size(filters) && !_.size(dashFilters)) {
        // do not save filters
        // - if there are none; and
        // - if there are no filters but the dashboard is saved with some filters
        this._deleteDashboardProperty(currentDashboardId, this._properties.filters);
      } else {
        this._setDashboardProperty(currentDashboardId, this._properties.filters, filters);
      }
      // save the query
      // queries contains only one query, the one from appState, since the meta argument is null
      // in the call to _getQueries above.
      // The query from the appState is always equal to the wildcard query if nothing was entered in the search bar by the user.
      if (this._isDefaultQuery(queries[0]) && (!dashQuery || this._isDefaultQuery(dashQuery.query))) {
        // do not save the query:
        // - if it is the default query; and
        // - if the dashboard query is also the default one
        this._deleteDashboardProperty(currentDashboardId, this._properties.query);
      } else {
        this._setDashboardProperty(currentDashboardId, this._properties.query, queries[0]);
      }
      // save time
      if (this._isDefaultTime(timefilter.time.mode, timefilter.time.from, timefilter.time.to) &&
          (!savedDash.timeRestore || this._isDefaultTime(savedDash.timeMode, savedDash.timeFrom, savedDash.timeTo, true))) {
        this._deleteDashboardProperty(currentDashboardId, this._properties.time);
      } else {
        this._saveTimeForDashboardId(currentDashboardId, timefilter.time.mode, timefilter.time.from, timefilter.time.to);
      }
      this.save();
    });
  };

  /**
   * Manage Relations from the relational panel
   */

  KibiState.prototype.getEnabledRelations = function () {
    return this[this._properties.enabled_relations] || [];
  };

  KibiState.prototype.enableRelation = function (relation) {
    if (!this[this._properties.enabled_relations]) {
      this[this._properties.enabled_relations] = [];
    }
    if (!this.isRelationEnabled(relation)) {
      this[this._properties.enabled_relations].push(relation);
      this.emit('relation', relation.dashboards);
    }
  };

  KibiState.prototype.disableAllRelations = function () {
    const dashboardIds = _(this.getEnabledRelations())
    .map((relation) => relation.dashboards)
    .flatten()
    .uniq()
    .value();
    this[this._properties.enabled_relations] = [];
    if (dashboardIds.length) {
      this.emit('relation', dashboardIds);
    }
  };

  KibiState.prototype.disableRelation = function (relation) {
    if (!this[this._properties.enabled_relations]) {
      this[this._properties.enabled_relations] = [];
    }
    const index = _.findIndex(this[this._properties.enabled_relations], relation);
    if (index !== -1) {
      this[this._properties.enabled_relations].splice(index, 1);
      this.emit('relation', relation.dashboards);
    }
  };

  KibiState.prototype.isRelationEnabled = function (relation) {
    if (this[this._properties.enabled_relations] instanceof Array) {
      return Boolean(_.find(this[this._properties.enabled_relations], relation));
    }
    return false;
  };

  KibiState.prototype.toggleRelationalPanel = function (toggle) {
    if (_.isUndefined(toggle)) {
      this[this._properties.enabled_relational_panel] = !this[this._properties.enabled_relational_panel];
    } else {
      this[this._properties.enabled_relational_panel] = toggle;
    }
  };

  KibiState.prototype.isRelationalPanelEnabled = function () {
    if (this[this._properties.enabled_relational_panel] === undefined) {
      // initialize the property
      this[this._properties.enabled_relational_panel] = true;
    }
    return this[this._properties.enabled_relational_panel];
  };

  KibiState.prototype.isRelationalPanelButtonEnabled = function () {
    return !!config.get('kibi:relationalPanel');
  };

  KibiState.prototype.isSirenJoinPluginInstalled = function () {
    const plugins = elasticsearchPlugins.get();
    return plugins.indexOf('siren-vanguard') !== -1;
  };

  return new KibiState();
}

uiRoutes
.addSetupWork(kibiState => kibiState.init())
.addSetupWork(elasticsearchPlugins => elasticsearchPlugins.init());

uiModules
.get('kibana/kibi_state')
.service('elasticsearchPlugins', (Promise, $http) => {
  let plugins;

  return {
    init: _.once(function () {
      return $http.get(`${getBasePath()}/getElasticsearchPlugins`)
      .then(res => {
        plugins = res.data;
      });
    }),
    get() {
      return plugins;
    }
  };
})
.service('kibiState', Private => Private(KibiStateProvider));
