define(function (require) {
  const _ = require('lodash');
  const qs = require('ui/utils/query_string');
  const dateMath = require('ui/utils/dateMath');
  const uniqFilters = require('ui/filter_bar/lib/uniqFilters');

  require('ui/routes')
  .addSetupWork(function (kibiState) {
    return kibiState.init();
  });

  require('ui/modules')
  .get('kibana/kibi_state')
  .service('kibiState', function (savedSearches, globalState, timefilter, $route, Promise, getAppState, savedDashboards, $rootScope,
                                  indexPatterns, elasticsearchPlugins, kibiEnterpriseEnabled, $location, config, Private, createNotifier) {
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
              const filters = _.reject(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);
              const query = _.find(meta.filter, (filter) => filter.query && filter.query.query_string && !filter.meta);

              // query
              if (!this._isDefaultQuery(query) && query && query.query) {
                this._setDashboardProperty(dashboard.id, this._properties.query, query.query);
              }
              // filters
              if (filters && filters.length) {
                this._setDashboardProperty(dashboard.id, this._properties.filters, filters);
              }
              // time
              if (dashboard.timeRestore && dashboard.timeFrom && dashboard.timeTo) {
                this._saveTimeForDashboardId(dashboard.id, dashboard.timeMode, dashboard.timeFrom, dashboard.timeTo, true);
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
      return query &&
        query.query_string &&
        query.query_string.query === '*' &&
        query.query_string.analyze_wildcard === true;
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
      this._setDashboardProperty(dashboardId, this._properties.time, {
        m: mode,
        f: fromStr,
        t: toStr
      });
    };

    /**
     * Shortcuts for properties in the kibistate
     */
    KibiState.prototype._properties = {
      dashboards: 'd',
      filters: 'f',
      query: 'q',
      time: 't',
      enabled_relations: 'j'
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
      this[this._properties.dashboards][dashboardId][prop] = value;
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
        return Promise.all(promises);
      });
    };

    /**
     * Returns the current set of filters for the given dashboard
     */
    KibiState.prototype._getFilters = function (appState, dashboardId, metas, { pinned }) {
      let filters;

      if (this._getCurrentDashboardId() === dashboardId) {
        filters = appState.filters || [];
      } else {
        filters = this._getDashboardProperty(dashboardId, this._properties.filters) || [];
      }

      if (pinned) {
        filters.push(..._.map(globalState.filters, (f) => _.omit(f, ['$state', '$$hashKey'])));
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
      filters = _.filter(filters, (f) => f.meta && !f.meta.disabled);
      return Promise.resolve(uniqFilters(filters, { state: true, negate: true, disabled: true }));
    };

    /**
     * Returns the current set of queries for the given dashboard
     */
    KibiState.prototype._getQueries = function (appState, dashboardId, metas) {
      let query;

      if (this._getCurrentDashboardId() === dashboardId) {
        query = appState.query;
      } else {
        const q = this._getDashboardProperty(dashboardId, this._properties.query);

        if (!q) {
          query = {
            query_string: {
              // TODO: https://github.com/sirensolutions/kibi-internal/issues/1153
              analyze_wildcard: true,
              query: '*'
            }
          };
        } else {
          query = q;
        }
      }

      // get the query from the search meta
      if (metas && metas.savedDash && metas.savedDash.id !== dashboardId) {
        const msg = `Something wrong occurred, got dashboard=${dashboardId} but meta is from dashboard=${metas.savedDash.id}`;
        return Promise.resolve(new Error(msg));
      }
      const smQuery = metas && metas.savedSearchMeta && metas.savedSearchMeta.query;
      if (smQuery && !_.isEqual(smQuery, query)) {
        return Promise.resolve([ query, smQuery ]);
      }
      return Promise.resolve([ query ]);
    };

    /**
     * Returns the current time for the given dashboard
     */
    KibiState.prototype._getTime = function (dashboardId, index) {
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

      if (!index) {
        return Promise.reject(new Error(`Missing index name when computing the time for dashboard ${dashboardId}`));
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

    KibiState.prototype._addAdvancedJoinSettingsToRelation = function (sourcePartOfTheRelationId, targetPartOfTheRelationId, rel) {
      if (kibiEnterpriseEnabled) {
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
     * Returns the set of dashboards ID which are connected to the focused dashboard, i.e., the connected component of the graph.
     * Relations is the array of relations between dashboards.
     */
    KibiState.prototype._getDashboardsIdInConnectedComponent = function (focus, relations) {
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

          if (!!label && label !== current[ind] && visited.indexOf(label) === -1) {
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

      // TODO:
      // refactor see issue https://github.com/sirensolutions/kibi-internal/issues/500
      return _.uniq(labels);
    };

    KibiState.prototype._getJoinFilter = function (focusIndex, filterAlias, filtersPerIndex, queriesPerIndex, timesPerIndex) {
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

          this._addAdvancedJoinSettingsToRelation(sourceIndex + '/' + sourcePath, targetIndex + '/' + targetPath , ret);

          return ret;
        });
      } catch (e) {
        return Promise.resolve(e);
      }

      /*
       * build the join_set filter
       */

      const joinFilter = {
        meta: {
          alias: filterAlias
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
            if (!joinFilter.join_set.queries[index]) {
              joinFilter.join_set.queries[index] = [];
            }
            _.each(queries, (fQuery) => {
              // filter out default queries
              if (fQuery && !this._isDefaultQuery(fQuery)) {
                if (!joinFilter.join_set.queries[index]) {
                  joinFilter.join_set.queries[index] = [];
                }
                joinFilter.join_set.queries[index].push({ query: fQuery });
              }
            });
          }
        });
      }

      // get the filters
      if (filtersPerIndex) {
        _.each(filtersPerIndex, (filters, index) => {
          if (filters instanceof Array && filters.length) {
            if (!joinFilter.join_set.queries[index]) {
              joinFilter.join_set.queries[index] = [];
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
              joinFilter.join_set.queries[index].push(filter);
            });
          }
        });
      }

      // get the times
      if (timesPerIndex) {
        _.each(timesPerIndex, (times, index) => {
          if (!joinFilter.join_set.queries[index]) {
            joinFilter.join_set.queries[index] = [];
          }
          joinFilter.join_set.queries[index].push(...times);
        });
      }

      return joinFilter;
    };

    /**
     * Returns the current state of the dashboard with given ID
     */
    KibiState.prototype.getState = function (dashboardId) {
      if (!dashboardId) {
        return Promise.reject(new Error('Missing dashboard ID'));
      }

      const options = {
        pinned: true
      };

      let dashboardIds = [ dashboardId ];
      if (this.isRelationalPanelEnabled()) {
        // collect ids of dashboards from enabled relations and in the connected component to dashboardId
        const tmpDashboardIds = this._getDashboardsIdInConnectedComponent(dashboardId, this.getEnabledRelations());
        const dashIndex = tmpDashboardIds.indexOf(dashboardId);

        if (dashIndex !== -1) { // focused dashboard is part of enabled relation
          // set the focus dashboard as the first element of the dashboards array
          const zeroDashboard = tmpDashboardIds[0];
          tmpDashboardIds[0] = dashboardId;
          tmpDashboardIds[dashIndex] = zeroDashboard;
          dashboardIds = tmpDashboardIds;
        }
      }

      const appState = getAppState();
      const getMetas = this._getDashboardAndSavedSearchMetas(dashboardIds);

      return getMetas.then((metas) => {
        const promises = [];

        for (let i = 0; i < metas.length; i++) {
          const meta = metas[i];
          promises.push(this._getFilters(appState, meta.savedDash.id, meta, options));
          promises.push(this._getQueries(appState, meta.savedDash.id, meta));
          promises.push(this._getTime(meta.savedDash.id, meta.savedSearchMeta.index));
        }
        return Promise.all(promises)
        .then(([ filters, queries, time, ...rest ]) => {
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
              timesPerIndex[thatIndex].push(rest[i + 2]);
            }

            _.forOwn(filtersPerIndex, (filters, index) => uniqFilters(_.compact(filters), { state: true, negate: true, disabled: true }));
            _.forOwn(queriesPerIndex, (queries, index) => _(queries).uniq().compact().value());
            _.forOwn(timesPerIndex, (times, index) => _(times).uniq().compact().value());
            const focusIndex = metas[0].savedSearchMeta.index;
            const filterAlias = _(dashboardIds).map((dashboardId, ind) => metas[ind].savedDash.title).sortBy().join(' <-> ');
            const joinFilter = this._getJoinFilter(focusIndex, filterAlias, filtersPerIndex, queriesPerIndex, timesPerIndex);
            filters.push(joinFilter);
          }
          return { filters, queries, time };
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
        pinned: false
      };

      return Promise.all([
        this._getFilters(appState, currentDashboardId, null, options),
        this._getQueries(appState, currentDashboardId, null)
      ])
      .then(([ filters, queries ]) => {
        // save filters
        if (filters && filters.length) {
          this._setDashboardProperty(currentDashboardId, this._properties.filters, filters);
        }
        // save queries
        if (this._isDefaultQuery(queries[0])) {
          this._deleteDashboardProperty(currentDashboardId, this._properties.query);
        } else {
          this._setDashboardProperty(currentDashboardId, this._properties.query, queries[0]);
        }
        // save time
        if (this._isDefaultTime(timefilter.time.mode, timefilter.time.from, timefilter.time.to)) {
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
      }
    };

    KibiState.prototype.disableRelation = function (relation) {
      if (!this[this._properties.enabled_relations]) {
        this[this._properties.enabled_relations] = [];
      }
      const index = _.findIndex(this[this._properties.enabled_relations], relation);
      if (index !== -1) {
        this[this._properties.enabled_relations].splice(index, 1);
      }
    };

    KibiState.prototype.isRelationEnabled = function (relation) {
      if (this[this._properties.enabled_relations] instanceof Array) {
        return Boolean(_.find(this[this._properties.enabled_relations], relation));
      }
      return false;
    };

    KibiState.prototype.isRelationalPanelEnabled = function () {
      return !!config.get('kibi:relationalPanel');
    };

    KibiState.prototype.isSirenJoinPluginInstalled = function () {
      return elasticsearchPlugins.indexOf('siren-join') !== -1;
    };

    return new KibiState();
  });
});
