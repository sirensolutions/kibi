define(function (require) {
  const _ = require('lodash');
  const qs = require('ui/utils/query_string');
  const dateMath = require('ui/utils/dateMath');
  const uniqFilters = require('ui/filter_bar/lib/uniqFilters');
  const toJson = require('ui/utils/aggressive_parse').toJson;
  const angular = require('angular');

  require('ui/routes')
  .addSetupWork(function (kibiState) {
    return kibiState.init();
  });

  require('ui/modules')
  .get('kibana/kibi_state')
  .service('kibiState', function (savedSearches, timefilter, $route, Promise, getAppState, savedDashboards, $rootScope, indexPatterns,
                                  globalState, elasticsearchPlugins, kibiEnterpriseEnabled, $location, config, Private, createNotifier) {
    const State = Private(require('ui/state_management/state'));
    const notify = createNotifier({ location: 'Kibi State'});

    _.class(KibiState).inherits(State);
    function KibiState(defaults) {
      KibiState.Super.call(this, '_k', defaults);

      this.init = _.once(function () {
        return savedDashboards.find().then((resp) => {
          if (resp.hits) {
            _.each(resp.hits, (dashboard) => {
              const meta = JSON.parse(dashboard.kibanaSavedObjectMeta.searchSourceJSON);
              let filters = _.reject(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
              const query = _.find(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);

              // query
              if (!this._isDefaultQuery(query) && query && query.query) {
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

            // Do not call save() method to prevent sending events
            // persist the state in the URL
            const search = $location.search();
            search[this._urlParam] = this.toRISON();
            $location.search(search).replace();
          }
        }).catch(notify.error);
      });
    }

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
      return _.get(query, 'query.query_string.query') === '*' && _.get(query, 'query.query_string.analyze_wildcard') === true;
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
      return this._setDashboardProperty(dashboardId, this._properties.time, {
        m: mode,
        f: fromStr,
        t: toStr
      });
    };

    /**
     * Shortcuts for properties in the kibistate
     */
    KibiState.prototype._properties = {
      filters: 'f',
      query: 'q',
      time: 't',
      // properties available in the diff array with the save_with_changes event
      dashboards: 'd',
      enabled_relations: 'j',
      enabled_relational_panel: 'e',
      groups: 'g',
      session_id: 's'
    };

    KibiState.prototype.setSessionId = function (id) {
      this[this._properties.session_id] = id;
    };

    KibiState.prototype.getSessionId = function () {
      return this[this._properties.session_id];
    };

    /**
     * Reset the filters, queries, and time for each dashboard to their saved state.
     */
    KibiState.prototype.resetFiltersQueriesTimes = function () {
      if (globalState.filters && globalState.filters.length) {
        // remove pinned filters
        globalState.filters = [];
        globalState.save();
      }
      if (this[this._properties.dashboards]) {
        return savedDashboards.find().then((resp) => {
          if (resp.hits) {
            const dashboardIdsToUpdate = [];
            const appState = getAppState();
            const timeDefaults = config.get('timepicker:timeDefaults');

            _.each(resp.hits, (dashboard) => {
              const meta = JSON.parse(dashboard.kibanaSavedObjectMeta.searchSourceJSON);
              const filters = _.reject(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
              const query = _.find(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);

              // reset appstate
              if (appState && dashboard.id === appState.id) {
                let queryChanged = false;
                // filters
                appState.filters = filters;

                // query
                const origQuery = query && query.query || {query_string: {analyze_wildcard: true, query: '*'}};
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
              if (this[this._properties.dashboards][dashboard.id]) {
                // query
                if (!query || this._isDefaultQuery(query)) {
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
            this.disableAllRelations();

            if (dashboardIdsToUpdate.length) {
              this.emit('reset', dashboardIdsToUpdate);
            }
            this.save();
          }
        });
      }
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

      if (!dash) {
        return;
      }
      return dash.id;
    };

    /**
     * For each dashboard id in the argument, return a promise with the saved dashboard and associated saved search meta.
     * If ignoreMissingSavedSearch is false, the promise is rejected if a dashboard does not have a saved search associated.
     * If dashboardIds is undefined, all dashboards are returned.
     */
    KibiState.prototype._getDashboardAndSavedSearchMetas = function (dashboardIds, ignoreMissingSavedSearch = false) {
      let getAllDashboards = !dashboardIds;

      dashboardIds = _.compact(dashboardIds);

      if (!getAllDashboards && !dashboardIds.length) {
        const msg = `Dashboards ${JSON.stringify(dashboardIds)} are not saved. It needs to be for one of the visualizations.`;
        return Promise.reject(new Error(msg));
      }

      // use find to minimize number of requests
      return Promise.all([ savedSearches.find(), savedDashboards.find() ]).then((results) => {
        const savedSearchesRes = results[0];
        const savedDashboardsRes = results[1];

        const promises = _(savedDashboardsRes.hits)
        // keep the dashboards that are in the array passed as argument
        .filter((savedDash) => getAllDashboards || _.contains(dashboardIds, savedDash.id))
        .map((savedDash) => {
          if (!ignoreMissingSavedSearch && !savedDash.savedSearchId) {
            return Promise.reject(new Error(`The dashboard [${savedDash.title}] is expected to be associated with a saved search.`));
          }
          const savedSearch = _.find(savedSearchesRes.hits, (hit) => hit.id === savedDash.savedSearchId);
          const savedSearchMeta = savedSearch ? JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON) : null;
          return { savedDash, savedSearchMeta };
        })
        .value();

        if (!getAllDashboards && dashboardIds.length !== promises.length) {
          const found = _(promises).filter((arg) => typeof arg === 'object').map(({ savedDash, savedSearchMeta }) => savedDash.id).value();
          return Promise.reject(new Error(`Unable to retrieve dashboards: ${JSON.stringify(_.difference(dashboardIds, found))}.`));
        }
        return Promise.all(promises).then((savedDashboardsAndsavedMetas) => {
          // here we need to sort the results based on dashboardIds order
          if (dashboardIds && dashboardIds.length > 0) {
            var ordered = [];
            var error;
            _.each(dashboardIds, (id) => {
              var hit = _.find(savedDashboardsAndsavedMetas, (dashAndMeta) => {
                return id === dashAndMeta.savedDash.id;
              });
              if (hit) {
                ordered.push(hit);
              } else {
                error = new Error('Could not find dashboard [' + id + '] in savedDashboards');
                return false; // to break the loop
              }
            });
            if (error) {
              return Promise.reject(error);
            }
            return ordered;
          }
          return savedDashboardsAndsavedMetas;
        });
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
      var compacted = _.compact(state.filters);
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
      let query = {
        query_string: {
          // TODO: https://github.com/sirensolutions/kibi-internal/issues/1153
          analyze_wildcard: true,
          query: '*'
        }
      };

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
      if (smQuery && !_.isEqual(smQuery, query)) {
        return Promise.resolve([ { query }, { query: smQuery } ]);
      }
      return Promise.resolve([ { query } ]);
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
      let time = {
        mode: timeDefaults.mode,
        from: timeDefaults.from,
        to: timeDefaults.to
      };

      if (dashboardId === this._getCurrentDashboardId()) {
        time = {
          mode: timefilter.time.mode,
          from: timefilter.time.from,
          to: timefilter.time.to
        };
      } else {
        const t = this._getDashboardProperty(dashboardId, this._properties.time);
        if (t) {
          time = {
            mode: t.m,
            from: t.f,
            to: t.t
          };
        }
      }

      return indexPatterns.get(index).then((indexPattern) => {
        var filter;
        var timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, {name: indexPattern.timeFieldName});

        if (timefield) {
          filter = {
            range : {
              [timefield.name]: {
                gte: dateMath.parseWithPrecision(time.from, false, $rootScope.kibiTimePrecision).valueOf(),
                lte: dateMath.parseWithPrecision(time.to, true, $rootScope.kibiTimePrecision).valueOf(),
                format: 'epoch_millis'
              }
            }
          };
        }

        return filter;
      });
    };

    /**
     * Adds advanced join parameters for the given relation.
     * Rel is an array with the following format:
     *     [
     *       { indices: [ 'index1' ], path: 'id1' },
     *       { indices: [ 'index2' ], path: 'id2' }
     *     ]
     */
    KibiState.prototype._addAdvancedJoinSettingsToRelation = function (rel) {
      if (kibiEnterpriseEnabled) {
        const sourcePartOfTheRelationId = rel[0].indices[0] + '/' + rel[0].path;
        const targetPartOfTheRelationId = rel[1].indices[0] + '/' + rel[1].path;

        const advKeys = ['termsEncoding', 'orderBy', 'maxTermsPerShard'];

        const relations = config.get('kibi:relations');
        // get indices relations
        const relationsIndices = relations.relationsIndices;

        if (!relationsIndices.length) {
          return;
        }

        // copying advanced options from corresponding index relation
        let forward;
        let indexRelation = _.find(relationsIndices, (r) => (sourcePartOfTheRelationId + '/' + targetPartOfTheRelationId) === r.id);
        if (indexRelation) {
          forward = true;
        } else {
          forward = false;
          // try to find the relation in other direction
          indexRelation = _.find(relationsIndices, (r) => (targetPartOfTheRelationId + '/' + sourcePartOfTheRelationId) === r.id);
          if (!indexRelation) {
            throw new Error(
              'Could not find index relation corresponding to relation between: ' +
              sourcePartOfTheRelationId + ' and ' + targetPartOfTheRelationId + '. Review the relations in the settings tab.');
          }
        }

        // TODO verify which advanced settings could be skipped
        // https://github.com/sirensolutions/kibi-internal/issues/868
        // e.g.
        // for join_set we need advanced settings only for the index which is not the focused one
        // for sequencial join we also only need settings for one

        if (forward) {
          _.each(indexRelation.indices[0], function (value, key) {
            if (advKeys.indexOf(key) !== -1) {
              rel[0][key] = value;
            };
          });
          _.each(indexRelation.indices[1], function (value, key) {
            if (advKeys.indexOf(key) !== -1) {
              rel[1][key] = value;
            };
          });
        }

        if (!forward) {
          _.each(indexRelation.indices[1], function (value, key) {
            if (advKeys.indexOf(key) !== -1) {
              rel[0][key] = value;
            };
          });
          _.each(indexRelation.indices[0], function (value, key) {
            if (advKeys.indexOf(key) !== -1) {
              rel[1][key] = value;
            };
          });
        }
      }
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

    KibiState.prototype._getJoinSetFilter = function (focusIndex, filterAlias, filtersPerIndex, queriesPerIndex, timesPerIndex) {
      // Build the relations for the join_set query
      let relations;
      try {
        relations = _.map(this.getEnabledRelations(), (r) => {
          const parts = r.relation.split('/');
          const sourceIndex = parts[0].replace('-slash-', '/');
          const sourcePath = parts[1].replace('-slash-', '/');
          const targetIndex = parts[2].replace('-slash-', '/');
          const targetPath = parts[3].replace('-slash-', '/');

          const ret = [
            {
              indices: [ sourceIndex ],
              path: sourcePath
            },
            {
              indices: [ targetIndex ],
              path: targetPath
            }
          ];

          this._addAdvancedJoinSettingsToRelation(ret);

          return ret;
        });
      } catch (e) {
        return Promise.resolve(e);
      }

      /*
       * build the join_set filter
       */

      const joinSetFilter = {
        meta: {
          alias: filterAlias,
          disabled: !this.isRelationalPanelEnabled()
        },
        join_set: {
          focus: focusIndex,
          relations: relations,
          queries: {}
        }
      };

      // get the queries
      if (queriesPerIndex) {
        _.each(queriesPerIndex, (queries, index) => {
          if (queries instanceof Array && queries.length) {
            if (!joinSetFilter.join_set.queries[index]) {
              joinSetFilter.join_set.queries[index] = [];
            }
            _.each(queries, (fQuery) => {
              // filter out default queries
              if (fQuery && !this._isDefaultQuery(fQuery)) {
                if (!joinSetFilter.join_set.queries[index]) {
                  joinSetFilter.join_set.queries[index] = [];
                }
                joinSetFilter.join_set.queries[index].push(fQuery);
              }
            });
          }
        });
      }

      // get the filters
      if (filtersPerIndex) {
        _.each(filtersPerIndex, (filters, index) => {
          if (filters instanceof Array && filters.length) {
            if (!joinSetFilter.join_set.queries[index]) {
              joinSetFilter.join_set.queries[index] = [];
            }
            _.each(filters, (fFilter) => {
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
              joinSetFilter.join_set.queries[index].push(filter);
            });
          }
        });
      }

      // get the times
      if (timesPerIndex) {
        _.each(timesPerIndex, (times, index) => {
          if (!joinSetFilter.join_set.queries[index]) {
            joinSetFilter.join_set.queries[index] = [];
          }
          joinSetFilter.join_set.queries[index].push(...times);
        });
      }

      return joinSetFilter;
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

      // check siren-join plugin
      if (this.isRelationalPanelButtonEnabled() && !this.isSirenJoinPluginInstalled()) {
        const error = 'The SIREn Join plugin is enabled but not installed. Please install the plugin and restart Kibi, ' +
          'or disable the relational panel in Settings -> Advanced -> kibi:relationalPanel';
        return Promise.reject(new Error(error));
      }

      const options = {
        pinned: true,
        disabled: false
      };

      let dashboardIds = [ dashboardId ];
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

      // here ignore the missing meta as getState can be called
      // on a dashboard without assosiated savedSearch
      const getMetas = this._getDashboardAndSavedSearchMetas(dashboardIds, true);

      return getMetas.then((metas) => {
        const promises = [];

        // extra check for metas
        // if dashboardIds is empty or contains only 1 element
        //   - the meta can be missing
        // else
        //   - each dashboard must have coresponding meta as these mean that we are passing
        //   set of relationally connected dashboards
        if (dashboardIds.length > 1) {
          for (let i = 0; i < metas.length; i++) {
            if (!metas[i].savedSearchMeta) {
              const error = 'The dashboard [' + metas[i].savedDash.id + '] is expected to be associated with a saved search.';
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
            const queriesPerIndex = {};
            const filtersPerIndex = {};
            const timesPerIndex = {};
            for (let i = 0, j = 1; i < rest.length; i += 3, j++) {
              const thatIndex = metas[j].savedSearchMeta.index;

              // filters
              if (!filtersPerIndex[thatIndex]) {
                filtersPerIndex[thatIndex] = [];
              }
              filtersPerIndex[thatIndex].push(...rest[i]);

              // queries
              if (!queriesPerIndex[thatIndex]) {
                queriesPerIndex[thatIndex] = [];
              }
              queriesPerIndex[thatIndex].push(...rest[i + 1]);

              // times
              if (!timesPerIndex[thatIndex]) {
                timesPerIndex[thatIndex] = [];
              }
              // add time filter only if it exists
              if (rest[i + 2]) {
                timesPerIndex[thatIndex].push(rest[i + 2]);
              }
            }

            _.forOwn(filtersPerIndex, (filters, index) => uniqFilters(_.compact(filters), { state: true, negate: true, disabled: true }));
            _.forOwn(queriesPerIndex, (queries, index) => _(queries).uniq().compact().value());
            _.forOwn(timesPerIndex, (times, index) => _(times).uniq().compact().value());
            const filterAlias = _(dashboardIds).map((dashboardId, ind) => metas[ind].savedDash.title).sortBy().join(' <-> ');
            const joinSetFilter = this._getJoinSetFilter(index, filterAlias, filtersPerIndex, queriesPerIndex, timesPerIndex);

            const existingJoinSetFilterIndex = _.findIndex(filters, (filter) => filter.join_set);
            if (existingJoinSetFilterIndex !== -1) {
              filters.splice(existingJoinSetFilterIndex, 1, joinSetFilter);
            } else {
              filters.push(joinSetFilter);
            }
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
        if (this._isDefaultQuery(queries[0]) && this._isDefaultQuery(dashQuery)) {
          // do not save the query:
          // - if it is the default query; and
          // - if the dashboard query is also the default one
          this._deleteDashboardProperty(currentDashboardId, this._properties.query);
        } else {
          this._setDashboardProperty(currentDashboardId, this._properties.query, queries[0].query);
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
     * Manage Relations
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

    KibiState.prototype.toggleRelationalPanel = function () {
      this[this._properties.enabled_relational_panel] = !this[this._properties.enabled_relational_panel];
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
      return elasticsearchPlugins.indexOf('siren-join') !== -1;
    };

    return new KibiState();
  });
});
