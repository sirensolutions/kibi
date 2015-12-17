define(function (require) {

  var getSavedSearchMeta =  require('components/kibi/count_helper/lib/get_saved_search_meta');
  var uniqFilters = require('components/filter_bar/lib/uniqFilters');

  return function UrlHelperFactory(
    Private, $location, $route, sessionStorage, savedDashboards,
    savedSearches, Promise, configFile, config, timefilter
  ) {
    var rison = require('utils/rison');
    var _ = require('lodash');
    var apps = Private(require('registry/apps'));
    var kibiStateHelper    = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
    var kibiTimeHelper   = Private(require('components/kibi/kibi_time_helper/kibi_time_helper'));


    var defaultApp = _.find(apps, function (app) {
      return app.id === configFile.default_app_id;
    });


    function UrlHelper() {
    }

    UrlHelper.prototype.getFiltersOfType = function (type) {
      var s = $location.search();
      var a = s._a;
      if (a) {
        var decodedA = rison.decode(a);
        if (decodedA.filters) {
          return _.filter(decodedA.filters, function (f) {
            return f[type];
          });
        }
      }
      return [];
    };

    UrlHelper.prototype.getJoinFilter = function () {
      var joinFilters = this.getFiltersOfType('join_set');
      if (joinFilters.length > 0) {
        return joinFilters[0];
      }
      return null;
    };

    UrlHelper.prototype.removeJoinFilter = function () {
      var s = $location.search();
      var a = s._a;
      if (a) {
        var decodedA = rison.decode(a);
        if (decodedA.filters) {
          var index = -1;
          _.each(decodedA.filters, function (f, i) {
            if (f.join_set) {
              index = i;
              return false;
            }
          });
          if (index !== -1) {
            decodedA.filters.splice(index, 1);
          }
          var encodedA = rison.encode(decodedA);
          $location.search('_a', encodedA);
        }
      }
    };

    UrlHelper.prototype.addFilter = function (filter) {
      var s = $location.search();
      var a = s._a;
      if (a) {
        var decodedA = rison.decode(a);
        if (!decodedA.filters) {
          decodedA.filters = [];
        }

        // here if there is a relational filter it should be replaced
        if (filter.join_set) {
          // replace
          var index = -1;
          _.each(decodedA.filters, function (f, i) {
            if (f.join_set) {
              index = i;
              return false;
            }
          });
          if (index !== -1) {
            // exists so replace
            decodedA.filters[index] = filter;
          } else {
            // do not exists so add
            decodedA.filters.push(filter);
          }
        } else {
          // add
          decodedA.filters.push(filter);
        }

        delete decodedA.panels;
        var encodedA = rison.encode(decodedA);
        $location.search('_a', encodedA);
      }
    };

    UrlHelper.prototype.switchDashboard = function (dashboardId) {
      if (dashboardId) {
        $location.path('dashboard/' + dashboardId);
        $route.reload();
      }
    };

    UrlHelper.prototype.replaceFiltersAndQueryAndTime = function (filters, query, time) {
      var s = $location.search();
      var a = s._a;
      var g = s._g;
      if (a) {
        var decodedA = rison.decode(a);
        if (filters) {
          decodedA.filters = filters;
        } else {
          decodedA.filters = [];
        }

        // replace only if the query object is present else remove it
        if (query === undefined) {
          delete decodedA.query;
        } else {
          decodedA.query = query;
        }

        delete decodedA.panels;
        var encodedA = rison.encode(decodedA);
        $location.search('_a', encodedA);
      }

      if (g) {
        var decodedG = rison.decode(g);
        if (time) {
          if (!decodedG.time) {
            decodedG.time = {};
          }
          decodedG.time.from = time.from;
          decodedG.time.to = time.to;

          var encodedG = rison.encode(decodedG);
          $location.search('_g', encodedG);
        }
      }
    };


    UrlHelper.prototype.isItDashboardUrl = function () {
      return $location.path() && $location.path().indexOf('/dashboard') === 0;
    };

    UrlHelper.prototype.getCurrentDashboardId = function () {
      var currentDashboardId;
      var currentPath = $location.path();
      if (currentPath.indexOf('/dashboard/') === 0) {
        currentDashboardId = currentPath.replace('/dashboard/', '');
      }
      return currentDashboardId;
    };


    // creates a map index -> dashboards
    // {
    //   indexId: [dashboardId1, dashboardId2],
    //   ...
    // }
    UrlHelper.prototype.getIndexToDashboardMap = function (dashboardsIds) {

      var _createMap = function (results) {
        // postprocess the results to create the map
        var indexToDashboardArrayMap = {};
        _.each(results, function (mapping) {
          if (!indexToDashboardArrayMap[mapping.indexId]) {
            indexToDashboardArrayMap[mapping.indexId] = [mapping.dashboardId];
          } else {
            if (indexToDashboardArrayMap[mapping.indexId].indexOf(mapping.dashboardId) === -1) {
              indexToDashboardArrayMap[mapping.indexId].push(mapping.dashboardId);
            }
          }
        });
        return indexToDashboardArrayMap;
      };


      if (dashboardsIds instanceof Array && dashboardsIds.length > 0) {

        var promises1 = [];
        _.each(dashboardsIds, function (dashboardId) {
          promises1.push(savedDashboards.get(dashboardId));
        });

        return Promise.all(promises1).then(function (savedDashboards) {

          var promises2 = [];
          _.each(savedDashboards, function (savedDashboard) {
            if (savedDashboard.savedSearchId) {
              promises2.push(savedSearches.get(savedDashboard.savedSearchId).then(function (dashboardSavedSearch) {
                return {
                  dashboardId: savedDashboard.id,
                  indexId: dashboardSavedSearch.searchSource._state.index.id
                };
              }));
            }
          });

          return Promise.all(promises2).then(function (results) {
            return _createMap(results);
          });
        });


      } else {

        return savedDashboards.find().then(function (resp) {
          var promises = [];
          _.each(resp.hits, function (dashboard) {
            if (dashboard.savedSearchId) {
              promises.push(
                savedSearches.get(dashboard.savedSearchId).then(function (dashboardSavedSearch) {
                  return {
                    dashboardId: dashboard.id,
                    indexId: dashboardSavedSearch.searchSource._state.index.id
                  };
                })
              );
            }
          });

          return Promise.all(promises).then(function (results) {
            return _createMap(results);
          });
        });

      }
    };


    UrlHelper.prototype.getRegularFiltersPerIndex = function (dashboardsIds) {
      var self = this;
      // grab filters here - they have to be in a format { indexId: [], indexId2: [] } without any join filter
      // but filters in kibi state are saved per dashboard
      // so iterate over dashboards check that they have savedSearchId and if they do take the filters
      // return a promise
      return new Promise(function (fulfill, reject) {
        var filters = {};
        self.getIndexToDashboardMap(dashboardsIds).then(function (indexToDashboardsMap) {
          _.each(indexToDashboardsMap, function (dashboardIds, indexId) {
            _.each(dashboardIds, function (dashboardId) {
              var fs = kibiStateHelper.getFiltersForDashboardId(dashboardId);
              var fsFiltered = _.filter(fs, function (f) {
                return !f.join_set;
              });
              if (!filters[indexId]) {
                filters[indexId] = fsFiltered;
              } else {
                filters[indexId] = filters[indexId].concat(fsFiltered);
              }
            });
          });
          fulfill(filters);
        });
      });
    };

    UrlHelper.prototype.getQueriesPerIndex = function (dashboardsIds) {
      var self = this;
      return new Promise(function (fulfill, reject) {
        var queries = {};
        self.getIndexToDashboardMap(dashboardsIds).then(function (indexToDashboardsMap) {
          _.each(indexToDashboardsMap, function (dashboardIds, indexId) {
            _.each(dashboardIds, function (dashboardId) {
              var query = kibiStateHelper.getQueryForDashboardId(dashboardId);
              if (query) {
                if (!queries[indexId]) {
                  queries[indexId] = [query];
                } else {
                  queries[indexId].push(query);
                }
              }
            });
          });

          fulfill(queries);
        });
      });
    };

    /**
     * The relations are from kibi:relations.relationsDashboards
     */
    UrlHelper.prototype.isDashboardInTheseRelations = function (dashboardId, relations) {
      if (relations) {
        for (var i = 0; i < relations.length; i++) {
          var relation = relations[i];
          if (relation.dashboards[0] === dashboardId || relation.dashboards[1] === dashboardId) {
            return true;
          }
        }
      }
      return false;
    };


    UrlHelper.prototype._filterDashboardsWithSameIndex = function (dashboardId, dashboards) {
      var self = this;
      return _.filter(dashboards, function (dashId) {
        if (dashId === dashboardId) {
          return false;
        }
        // grab only enabled relations based on kibiState
        var enabledRelations = _.filter(config.get('kibi:relations').relationsDashboards, function (relation) {
          return kibiStateHelper.isRelationEnabled(relation.relation);
        });
        // now checked that the dashId is in enabled relations either as a source or target
        return self.isDashboardInTheseRelations(dashId, enabledRelations);
      });
    };


    /**
     * For each dashboard based on the same index it should take
     *  a) filters from kibiState (except join_set one)
     *  b) time from kibiState (transform it to proper range filter)
     *  c) filters from savedSearch Meta
     * do it only if relational panel enaabled
     */
    UrlHelper.prototype.getFiltersFromDashboardsWithSameIndex = function (dashboardId, indexPattern) {
      var self = this;
      return new Promise(function (fulfill, reject) {
        // get relations for config
        var connectedDashboardIds = [];
        if (config.get('kibi:relationalPanel')) {
          self.getIndexToDashboardMap().then(function (indexToDashboardsMap) {
            if (indexToDashboardsMap[indexPattern.id]) {
              // filter out current dashboard
              // and all dashboards which are not in enabled relations
              // we want filters only from dashboards which are in the currently enabled relations
              var dashboardIds = self._filterDashboardsWithSameIndex(
                dashboardId,
                indexToDashboardsMap[indexPattern.id]
              );
              // now for each dashboard we have to take:
              // filters from kibiState
              // filters from savedSearchMeta
              // time filter from kibiState
              var promises = [];
              _.each(dashboardIds, function (dashId) {
                promises.push(savedDashboards.get(dashId).then(function (savedDash) {
                  if (!savedDash.savedSearchId) {
                    throw new Error('Dashboard [' + savedDash + '] is expected to have savedSearchId');
                  }
                  return savedSearches.get(savedDash.savedSearchId).then(function (savedSearch) {
                    var dashFilters = kibiStateHelper.getFiltersForDashboardId(dashId) || [];
                    var filters = _.filter(dashFilters, function (df) {
                      return !df.join_set;
                    });
                    var savedSearchMeta = getSavedSearchMeta(savedSearch);
                    if (savedSearchMeta.filter) {
                      filters = filters.concat(savedSearchMeta.filter);
                    }

                    var timeFilter = timefilter.get(indexPattern);
                    if (timeFilter) {
                      return kibiTimeHelper.updateTimeFilterForDashboard(dashId, timeFilter)
                        .then(function (updatedTimeFilter) {
                          filters.push(updatedTimeFilter);
                          return uniqFilters(filters);
                        });
                    } else {
                      return uniqFilters(filters);
                    }
                  });
                }));
              });
              Promise.all(promises).then(function (results) {
                var all = [];
                _.each(results, function (res) {
                  all = all.concat(res);
                });
                fulfill(all);
              }).catch(reject);
            } else {
              fulfill([]);
            }
          });
        } else {
          fulfill([]);
        }
      });
    };

    UrlHelper.prototype.getQueriesFromDashboardsWithSameIndex = function (dashboardId, indexPattern) {
      var self = this;
      return new Promise(function (fulfill, reject) {
        // get relations for config
        var connectedDashboardIds = [];
        if (config.get('kibi:relationalPanel')) {
          self.getIndexToDashboardMap().then(function (indexToDashboardsMap) {
            if (indexToDashboardsMap[indexPattern.id]) {
              // filter out current dashboard
              // and all dashboards which are not in enabled relations
              // we want queries only from dashboards which are in the currently enabled relations
              var dashboardIds = self._filterDashboardsWithSameIndex(
                dashboardId,
                indexToDashboardsMap[indexPattern.id]
              );
              // now for each dashboard we have to take:
              // query from kibiState
              // query from savedSearch
              var promises = [];
              _.each(dashboardIds, function (dashId) {
                promises.push(savedDashboards.get(dashId).then(function (savedDash) {
                  if (!savedDash.savedSearchId) {
                    throw new Error('Dashboard [' + savedDash + '] is expected to have savedSearchId');
                  }
                  return savedSearches.get(savedDash.savedSearchId).then(function (savedSearch) {
                    var queries = [];
                    var q1 = kibiStateHelper.getQueryForDashboardId(dashId);
                    if (q1) {
                      queries.push(q1);
                    }
                    var savedSearchMeta = getSavedSearchMeta(savedSearch);
                    if (savedSearchMeta.query) {
                      queries.push(savedSearchMeta.query);
                    }
                    return queries;
                  });
                }));
              });
              Promise.all(promises).then(function (results) {
                var all = [];
                _.each(results, function (res) {
                  all = all.concat(res);
                });
                fulfill(all);
              }).catch(reject);
            } else {
              fulfill([]);
            }
          });
        } else {
          fulfill([]);
        }
      });
    };


    UrlHelper.prototype.getCurrentDashboardQuery = function () {
      var currentDashboardId = this.getCurrentDashboardId();
      if (!currentDashboardId) {
        return;
      }

      var s = $location.search();
      var a = s._a;

      if (a) {
        var decodedA = rison.decode(a);
        return decodedA.query;
      }
      return null;
    };

    UrlHelper.prototype.getCurrentDashboardFilters = function () {
      var currentDashboardId = this.getCurrentDashboardId();
      if (!currentDashboardId) {
        return;
      }
      var s = $location.search();
      var a = s._a;
      if (a) {
        var decodedA = rison.decode(a);
        if (decodedA.filters) {
          return _.filter(decodedA.filters, function (f) {
            return f.meta && f.meta.disabled !== true;
          });
        }
      }
      return null;
    };

    UrlHelper.prototype.getPathnameFromUrl = function (url) {
      var start = url.indexOf('#');
      var stop = url.indexOf('?', start) || url.length;
      return url.substring(start, stop);
    };

    UrlHelper.prototype._getParamFromUrl = function (url, paramName, urlStateParamName) {
      var start = url.indexOf('#');
      start = start === -1 ? url.indexOf('?') : url.indexOf('?', start);
      var queryString = url.substring(start + 1);
      var paramPairs = queryString.split('&');
      for (var i = 0; i < paramPairs.length; i++) {
        var pair = paramPairs[i];
        var parts = pair.split('=');
        if (parts[0] === urlStateParamName && parts.length === 2) {
          var decodedA = rison.decode(parts[1]);
          return decodedA[paramName];
        }
      }
    };

    UrlHelper.prototype.getLocalParamFromUrl = function (url, paramName) {
      return this._getParamFromUrl(url, paramName, '_a');
    };
    UrlHelper.prototype.getGlobalParamFromUrl = function (url, paramName) {
      return this._getParamFromUrl(url, paramName, '_g');
    };

    UrlHelper.prototype.getInitialPath = function (app) {
      return new Promise(function (fulfill, reject) {
        if (typeof app === 'undefined') {
          app = defaultApp;
          if (typeof app === 'undefined' || app === null || app === false) {
            fulfill('/');
            return;
          }
          app.lastPath = app.rootPath;
        }
        if (app && app.id === 'dashboard' && (app.rootPath === app.lastPath)) {
          if (configFile.default_dashboard_id && configFile.default_dashboard_id !== '') {

            // check that the dashboard exists
            savedDashboards.get(configFile.default_dashboard_id).then(function (savedDashboard) {
              fulfill('/' + app.id + '/' + savedDashboard.id);
            }).catch(function (err) {
              // could not find the specified dashboard, open the first available
              savedDashboards.find().then(function (resp) {
                if (resp.hits && resp.hits.length > 0) {
                  fulfill('/' + app.id + '/' + resp.hits[0].id);
                } else {
                  // no dashboards, display the creation form
                  fulfill('/' + app.id);
                }
              });
            });
          } else {
            fulfill(app.lastPath ? app.lastPath : '/' + app.id);
          }
        } else {
          fulfill(app.lastPath ? app.lastPath : '/' + app.id);
        }
      });
    };

    UrlHelper.prototype.shouldUpdateCountsBasedOnLocation = function (oldUrl, newUrl) {
      var newPath = this.getPathnameFromUrl(newUrl);
      var oldPath = this.getPathnameFromUrl(oldUrl);

      var newFilters = this.getLocalParamFromUrl(newUrl, 'filters');
      var oldFilters = this.getLocalParamFromUrl(oldUrl, 'filters');
      var newQuery = this.getLocalParamFromUrl(newUrl, 'query');
      var oldQuery = this.getLocalParamFromUrl(oldUrl, 'query');

      var newGlobalFilters = this.getGlobalParamFromUrl(newUrl, 'filters');
      var oldGlobalFilters = this.getGlobalParamFromUrl(oldUrl, 'filters');
      var newGlobalTime = this.getGlobalParamFromUrl(newUrl, 'time');
      var oldGlobalTime = this.getGlobalParamFromUrl(oldUrl, 'time');

      return newPath === oldPath && (
             !_.isEqual(newFilters, oldFilters, true) ||
             !_.isEqual(newQuery, oldQuery, true) ||
             !_.isEqual(newGlobalFilters, oldGlobalFilters, true) ||
             !_.isEqual(newGlobalTime, oldGlobalTime, true));
    };



    return new UrlHelper();
  };

});
