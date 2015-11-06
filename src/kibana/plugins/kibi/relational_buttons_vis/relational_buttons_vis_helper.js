define(function (require) {
  var _ = require('lodash');
  var getSavedSearchMeta =  require('components/kibi/count_helper/lib/get_saved_search_meta');

  return function RelationVisHelperFactory(Private, savedDashboards, savedSearches, timefilter, Promise) {

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
          button.joinFilter = null;

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

            } else if (this.joinFilter) {
              if (button.filterLabel) {
                this.joinFilter.meta.value = button.filterLabel
                .replace(/\$COUNT/g, this.sourceCount)
                .replace(/\$DASHBOARD/g, urlHelper.getCurrentDashboardId());
              } else {
                this.joinFilter.meta.value = '... related to (' + this.sourceCount + ') from ' + urlHelper.getCurrentDashboardId();
              }


              // add or Filter and switch
              if (!targetDashboardFilters) {
                targetDashboardFilters = [this.joinFilter];
              } else {
                joinFilterHelper.replaceOrAddJoinFilter(targetDashboardFilters, this.joinFilter);
              }

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


    RelationVisHelper.prototype.buildNewJoinSeqFilter = function (button, currentDashboardSavedSearch) {
      return new Promise(function (fulfill, reject) {

        // at the end we need
        // join_sequence: {
        //   meta:
        //   join_sequence: []
        // }
        // where seq conains 2 dashboard elements
        // [
        //   {
        //     path: source.path
        //     indices: [source]
        //     queries: [{
        //       query: {
        //         filtered: {
        //           query: {},
        //           filter: {
        //             bool: {
        //               must: [],
        //               must_not: []
        //             }
        //           }
        //         }
        //       }
        //     }]
        //   },
        //   {
        //     path: target.path
        //     indices: [target]
        //   }
        // ]

        var label = 'First join_seq filter ever';

        var joinSeqFilter = {
          meta: {
            value: label
          },
          join_sequence: [
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

        var sourceIndexPatternId = button.sourceIndexPatternId;
        var sequenceElementIndex = 0;

        // TODO: refactor
        // below this line code is identical to code in updateQueriesOnLastElement method

        var $queries_ref = joinSeqFilter.join_sequence[sequenceElementIndex].queries;

        var sourceFilters = urlHelper.getCurrentDashboardFilters();

        // add filters and query from saved search
        var savedSearchMeta = getSavedSearchMeta(currentDashboardSavedSearch);
        if (savedSearchMeta.query && !kibiStateHelper.isAnalyzedWildcardQueryString(savedSearchMeta.query)) {
          $queries_ref.push(savedSearchMeta.query);
        }
        if (savedSearchMeta.filter && savedSearchMeta.filter.length > 0 ) {
          sourceFilters = sourceFilters.concat(savedSearchMeta.filter);
        }

        // check all filters - remove meta and push to must or must not depends on negate flag
        _.each(sourceFilters, function (f) {
          if (f.meta && f.meta.negate === true) {
            delete f.meta;
            $queries_ref[0].query.filtered.filter.bool.must_not.push(f);
          } else if (f.meta) {
            delete f.meta;
            $queries_ref[0].query.filtered.filter.bool.must.push(f);
          }
        });


        // update the timeFilter
        var sourceTimeFilter = timefilter.get(sourceIndexPatternId);
        if (sourceTimeFilter) {
          var sourceDashboardId = urlHelper.getCurrentDashboardId();
          kibiTimeHelper.updateTimeFilterForDashboard(sourceDashboardId, sourceTimeFilter).then(function (updatedTimeFilter) {
            // add time filter
            $queries_ref[0].query.filtered.filter.bool.must.push(updatedTimeFilter);
            fulfill(joinSeqFilter);
          });
        } else {
          fulfill(joinSeqFilter);
        }
      });
    };

    RelationVisHelper.prototype.updateQueriesOnLastElement = function (button, currentDashboardSavedSearch, joinSeqFilter) {
      return new Promise(function (fulfill, reject) {

        var sequenceElementIndex = joinSeqFilter.join_sequence.length - 1;

        // set a query
        joinSeqFilter.join_sequence[sequenceElementIndex].queries = [
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
        ];

        var $queries_ref = joinSeqFilter.join_sequence[sequenceElementIndex].queries;

        var sourceFilters = _.filter(urlHelper.getCurrentDashboardFilters(), function (f) {
          // all except join_sequence
          return !f.join_sequence;
        });

        // add filters and query from saved search
        var savedSearchMeta = getSavedSearchMeta(currentDashboardSavedSearch);
        if (savedSearchMeta.query && !kibiStateHelper.isAnalyzedWildcardQueryString(savedSearchMeta.query)) {
          $queries_ref.push(savedSearchMeta.query);
        }
        if (savedSearchMeta.filter && savedSearchMeta.filter.length > 0 ) {
          sourceFilters = sourceFilters.concat(savedSearchMeta.filter);
        }


        // check all filters - remove meta and push to must or must not depends on negate flag
        _.each(sourceFilters, function (f) {
          if (f.meta && f.meta.negate === true) {
            delete f.meta;
            $queries_ref[0].query.filtered.filter.bool.must_not.push(f);
          } else if (f.meta) {
            delete f.meta;
            $queries_ref[0].query.filtered.filter.bool.must.push(f);
          }
        });


        // update the timeFilter
        var sourceTimeFilter = timefilter.get(button.sourceIndexPatternId);
        if (sourceTimeFilter) {
          var sourceDashboardId = urlHelper.getCurrentDashboardId();
          kibiTimeHelper.updateTimeFilterForDashboard(sourceDashboardId, sourceTimeFilter).then(function (updatedTimeFilter) {
            // add time filter
            $queries_ref[0].query.filtered.filter.bool.must.push(updatedTimeFilter);
            fulfill(joinSeqFilter);
          });
        } else {
          fulfill(joinSeqFilter);
        }
      });
    };


    RelationVisHelper.prototype.addTargetToTheSequence = function (button, joinSeqFilter) {
      joinSeqFilter.join_sequence.push({
        path: button.targetField,
        indices: [button.targetIndexPatternId]
      });
    };

    RelationVisHelper.prototype.addGroupFromExistingJoinFilters = function (joinSeqFilter, joinSeqFilters) {
      var group = [];
      _.each(joinSeqFilters, function (f) {
        group.push(f.join_sequence);
      });

      joinSeqFilter.join_sequence.unshift(group);
    };


    RelationVisHelper.prototype.buildCountQuery = function (targetDashboardId, join_seq_filter) {
      return new Promise(function (fulfill, reject) {
        savedDashboards.get(targetDashboardId).then(function (targetSavedDashboard) {
          if (targetSavedDashboard.savedSearchId) {
            savedSearches.get(targetSavedDashboard.savedSearchId).then(function (targetSavedSearch) {
              var targetDashboardFilters = kibiStateHelper.getFiltersForDashboardId(targetSavedDashboard.id);
              var extraFilters = [join_seq_filter];
              countHelper.constructCountQuery(targetDashboardId, targetSavedSearch, extraFilters, null)
              .then(function (query) {
                fulfill(query);
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
