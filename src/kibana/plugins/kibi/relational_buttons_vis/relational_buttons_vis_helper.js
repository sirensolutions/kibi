define(function (require) {
  var _ = require('lodash');
  var getSavedSearchMeta =  require('components/kibi/count_helper/lib/get_saved_search_meta');

  return function RelationVisHelperFactory(Private, savedDashboards, savedSearches, indexPatterns, timefilter, Promise) {

    var kibiTimeHelper   = Private(require('components/kibi/kibi_time_helper/kibi_time_helper'));
    var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
    var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
    var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));
    var countHelper      = Private(require('components/kibi/count_helper/count_helper'));

    function RelationVisHelper() {

    }

    RelationVisHelper.prototype.constructButtonsArray = function (buttonDefs, currentDashboardIndexId) {
      return _.chain(buttonDefs)
        .filter(function (buttonDef) {
          if (!currentDashboardIndexId) {
            return buttonDef.sourceIndexPatternId && buttonDef.label;
          }
          return buttonDef.sourceIndexPatternId === currentDashboardIndexId && buttonDef.label;
        })
        .map(function (buttonDef) {
          var button = _.clone(buttonDef);

          button.click = function () {
            if (!currentDashboardIndexId) {
              return;
            }
            kibiStateHelper.saveFiltersForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardFilters());
            kibiStateHelper.saveQueryForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardQuery());


            // get filters from dashboard we would like to switch to
            var targetDashboardQuery   = kibiStateHelper.getQueryForDashboardId(this.redirectToDashboard);
            var targetDashboardFilters = kibiStateHelper.getFiltersForDashboardId(this.redirectToDashboard);
            var targetDashboardTimeFilter = kibiStateHelper.getTimeForDashboardId(this.redirectToDashboard);


            if (this.joinSeqFilter) {
              if (button.filterLabel) {
                this.joinSeqFilter.meta.value = button.filterLabel
                .replace(/\$COUNT/g, this.sourceCount)
                .replace(/\$DASHBOARD/g, urlHelper.getCurrentDashboardId());
              } else {
                this.joinSeqFilter.meta.value = '... related to (' + this.sourceCount + ') from ' + urlHelper.getCurrentDashboardId();
              }


              // add or Filter and switch
              if (!targetDashboardFilters) {
                targetDashboardFilters = [];
              }
              targetDashboardFilters.push(this.joinSeqFilter);

              // switch to target dashboard
              urlHelper.replaceFiltersAndQueryAndTime(
                targetDashboardFilters,
                targetDashboardQuery,
                targetDashboardTimeFilter);
              urlHelper.switchDashboard(this.redirectToDashboard);
            } else {
              // just redirect to the target dashboard
              urlHelper.switchDashboard(this.redirectToDashboard);
            }

          };
          return button;
        }).value();
    };


    // Returns:
    //
    // join_sequence: {
    //   meta:
    //   join_sequence: []
    // }
    // where join_sequence conains 1 relation object between 2 dashboard elements
    // [
    //   {
    //     relation: [
    //      {
    //        path: source.path
    //        indices: [source]
    //        queries: [{
    //          query: {
    //            filtered: {
    //              query: {},
    //              filter: {
    //                bool: {
    //                  must: [],
    //                  must_not: []
    //                }
    //              }
    //            }
    //          }
    //        }
    //      ]
    //   },
    //   {
    //     path: target.path
    //     indices: [target]
    //   }
    // ]
    RelationVisHelper.prototype.buildNewJoinSeqFilter = function (button, currentDashboardSavedSearch) {
      return this._getRelation(button, currentDashboardSavedSearch).then(function (relation) {

        var label = 'First join_seq filter ever';
        return {
          meta: {
            value: label
          },
          join_sequence: [relation]
        };

      });
    };


    RelationVisHelper.prototype.addRelationToJoinSeqFilter = function (button, currentDashboardSavedSearch, joinSeqFilter) {
      var self = this;
      var joinSeqFiltersCloned = _.cloneDeep(joinSeqFilter);

      return this._getRelation(button, currentDashboardSavedSearch).then(function (relation) {
        self._negateLastElementOfTheSequenceIfFilterWasNegated(joinSeqFiltersCloned);
        joinSeqFiltersCloned.join_sequence.push(relation);
        // make sure that the new filter is not negated
        joinSeqFiltersCloned.meta.negate = false;
        return joinSeqFiltersCloned;
      });
    };


    RelationVisHelper.prototype.composeGroupFromExistingJoinFilters = function (joinSeqFilters) {
      var self = this;
      var g = {
        group: []
      };
      _.each(joinSeqFilters, function (f) {
        var joinSeqFiltersCloned = _.cloneDeep(f);
        self._negateLastElementOfTheSequenceIfFilterWasNegated(joinSeqFiltersCloned);
        g.group.push(joinSeqFiltersCloned.join_sequence);
      });
      return g;
    };


    RelationVisHelper.prototype._negateLastElementOfTheSequenceIfFilterWasNegated = function (joinSeqFilter) {
      if (joinSeqFilter.meta && joinSeqFilter.meta.negate === true) {
        joinSeqFilter.join_sequence[joinSeqFilter.join_sequence.length - 1].negate = true;
      }
    };


    RelationVisHelper.prototype._getRelation = function (button, currentDashboardSavedSearch) {
      return new Promise(function (fulfill, reject) {
        var ret = {
          relation: [
            {
              path: button.sourceField,
              indices: [button.sourceIndexPatternId],
              queries: [
                {
                  query: {
                    filtered: {
                      query: urlHelper.getCurrentDashboardQuery(),
                      // will be created below if needed
                      filter: {
                        bool: {
                          must: [],
                          must_not: []
                        }
                      }
                    }
                  }
                }
              ]
            },
            {
              path: button.targetField,
              indices: [button.targetIndexPatternId]
            }
          ]
        };

        var sourceFilters = _.filter(urlHelper.getCurrentDashboardFilters(), function (f) {
          // all except join_sequence
          return !f.join_sequence;
        });

        // add filters and query from saved search
        var savedSearchMeta = getSavedSearchMeta(currentDashboardSavedSearch);
        if (savedSearchMeta.query && !kibiStateHelper.isAnalyzedWildcardQueryString(savedSearchMeta.query)) {
          ret.relation[0].queries.push(savedSearchMeta.query);
        }
        if (savedSearchMeta.filter && savedSearchMeta.filter.length > 0 ) {
          sourceFilters = sourceFilters.concat(savedSearchMeta.filter);
        }

        // check all filters - remove meta and push to must or must not depends on negate flag
        _.each(sourceFilters, function (f) {
          if (f.meta && f.meta.negate === true) {
            delete f.meta;
            ret.relation[0].queries[0].query.filtered.filter.bool.must_not.push(f);
          } else if (f.meta) {
            delete f.meta;
            ret.relation[0].queries[0].query.filtered.filter.bool.must.push(f);
          }
        });


        // update the timeFilter
        indexPatterns.get(button.sourceIndexPatternId).then(function (indexPattern) {
          var sourceTimeFilter = timefilter.get(indexPattern);
          if (sourceTimeFilter) {
            var sourceDashboardId = urlHelper.getCurrentDashboardId();
            kibiTimeHelper.updateTimeFilterForDashboard(sourceDashboardId, sourceTimeFilter).then(function (updatedTimeFilter) {
              // add time filter
              ret.relation[0].queries[0].query.filtered.filter.bool.must.push(updatedTimeFilter);
              fulfill(ret);
            });
          } else {
            fulfill(ret);
          }
        });

      });
    };


    RelationVisHelper.prototype.buildCountQuery = function (targetDashboardId, joinSeqFilter) {
      return new Promise(function (fulfill, reject) {
        savedDashboards.get(targetDashboardId).then(function (targetSavedDashboard) {
          if (targetSavedDashboard.savedSearchId) {
            savedSearches.get(targetSavedDashboard.savedSearchId).then(function (targetSavedSearch) {

              // in case relational panel is enabled at the same time
              // as buttons take care about extra filters and queries from
              // dashboards based on the same index
              var targetDashboardIndex = targetSavedSearch.searchSource._state.index;
              var promises = [
                urlHelper.getQueriesFromDashboardsWithSameIndex(targetDashboardId, targetDashboardIndex),
                urlHelper.getFiltersFromDashboardsWithSameIndex(targetDashboardId, targetDashboardIndex)
              ];
              Promise.all(promises).then(function (results) {
                var queriesFromDashboardsWirhSameIndex = results[0];
                var filtersFromDashboardsWirhSameIndex = results[1] || [];
                if (joinSeqFilter) {
                  filtersFromDashboardsWirhSameIndex = filtersFromDashboardsWirhSameIndex.concat(joinSeqFilter);
                }
                countHelper.constructCountQuery(
                  targetDashboardId,
                  targetSavedSearch,
                  null,  // do not put joinSeqFilter here as this parameter is reserved to join_set only !!!
                  queriesFromDashboardsWirhSameIndex,
                  filtersFromDashboardsWirhSameIndex
                )
                .then(function (query) {
                  fulfill({
                    query: query,
                    index: targetDashboardIndex
                  });
                }).catch(reject);
              }).catch(reject);
            }).catch(reject);
          } else {
            reject(new Error('Target dashboard does not have saved search'));
          }
        }).catch(reject);
      });
    };


    return new RelationVisHelper();
  };

});
