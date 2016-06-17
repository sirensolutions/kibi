define(function (require) {
  const _ = require('lodash');
  const qs = require('ui/utils/query_string');

  require('ui/routes')
  .addSetupWork(function (kibiState) {
    return kibiState.init();
  });

  require('ui/modules')
  .get('kibana/kibi_state')
  .service('kibiState', function (savedSearches, globalState, timefilter, $route, Promise, getAppState, savedDashboards,
                                  $location, config, Private, createNotifier) {
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
              if (this._isAnalyzedWildcardQueryString(query)) {
                this._setDashboardProperty(dashboard.id, this._properties.query, '*');
              } else {
                this._setDashboardProperty(dashboard.id, this._properties.query, query && query.query || '*');
              }
              // filters
              this._setDashboardProperty(dashboard.id, this._properties.filters, filters);
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
    KibiState.prototype._isAnalyzedWildcardQueryString = function (query) {
      return query &&
        query.query_string &&
        query.query_string.query === '*' &&
        query.query_string.analyze_wildcard === true;
    };

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

    KibiState.prototype._properties = {
      dashboards: 'd',
      filters: 'f',
      query: 'q',
      time: 't'
    };

    KibiState.prototype._setDashboardProperty = function (dashboardId, prop, value) {
      if (!this[this._properties.dashboards]) {
        this[this._properties.dashboards] = {};
      }
      if (!this[this._properties.dashboards][dashboardId]) {
        this[this._properties.dashboards][dashboardId] = {};
      }
      this[this._properties.dashboards][dashboardId][prop] = value;
    };

    KibiState.prototype._getDashboardProperty = function (dashboardId, prop) {
      if (!this[this._properties.dashboards] || !this[this._properties.dashboards][dashboardId]) {
        return undefined;
      }
      return this[this._properties.dashboards][dashboardId][prop];
    };

    KibiState.prototype._getCurrentDashboardId = function () {
      const dash = _.get($route, 'current.locals.dash');

      if (!dash) {
        return;
      }
      return dash.id;
    };

    /**
     * For each dashboard id in the argument, return a promise with the saved dashboard and associated saved search meta.
     * The promise is rejected if a dashboard does not have a saved search associated.
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
      return Promise.resolve(_.filter(filters, (f) => f.meta && !f.meta.disabled));
    };

    KibiState.prototype._getQuery = function (appState, dashboardId, metas) {
      let query;

      if (this._getCurrentDashboardId() === dashboardId) {
        query = appState.query;
      } else {
        const q = this._getDashboardProperty(dashboardId, this._properties.query);

        if (q === '*') { // if '*' was stored make it again a full query
          query = {
            query_string: {
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
      if (smQuery) {
        return Promise.resolve([ query, smQuery ]);
      }
      return Promise.resolve(query);
    };

    KibiState.prototype._getTime = function (dashboardId) {
      if (dashboardId === this._getCurrentDashboardId()) {
        return Promise.resolve({
          mode: timefilter.time.mode,
          from: timefilter.time.from,
          to: timefilter.time.to
        });
      } else {
        const t = this._getDashboardProperty(dashboardId, this._properties.time);
        if (t) {
          return Promise.resolve({
            mode: t.m,
            from: t.f,
            to: t.t
          });
        }
      }
      // take default time
      const timeDefaults = config.get('timepicker:timeDefaults');
      return Promise.resolve({
        mode: timeDefaults.mode,
        from: timeDefaults.from,
        to: timeDefaults.to
      });
    };

    KibiState.prototype.getState = function (dashboardId, { join_set, pinned, searchMeta }) {
      const appState = getAppState();

      // TODO if join_set == true get all the required dashboards
      const getMetas = searchMeta ? this._getDashboardAndSavedSearchMetas([ dashboardId ]) : Promise.resolve([{}]);

      return getMetas.then((metas) => {
        return Promise.all([
          this._getFilters(appState, dashboardId, metas[0], { pinned }),
          this._getQuery(appState, dashboardId, metas[0]),
          this._getTime(dashboardId)
        ]).then(([ filters, query, time ]) => {
          return { filters, query, time };
        });
      });
    };

    KibiState.prototype.saveAppState = function () {
      const currentDashboardId = this._getCurrentDashboardId();
      const options = {
        join_set: false,
        pinned: false,
        searchMeta: false
      };

      return this.getState(currentDashboardId, options)
      .then(({ filters, query, time }) => {
        this._setDashboardProperty(currentDashboardId, this._properties.filters, filters);
        this._setDashboardProperty(currentDashboardId, this._properties.query, query);
        this._setDashboardProperty(currentDashboardId, this._properties.time, time);
        this.save();
      });
    };

    return new KibiState();
  });
});
