define(function (require) {
  var _ = require('lodash');

  return function RelationVisHelperFactory(Private, indexPatterns, timefilter, Promise) {

    var kibiTimeHelper   = Private(require('ui/kibi/helpers/kibi_time_helper'));
    var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
    var urlHelper        = Private(require('ui/kibi/helpers/url_helper'));
    var joinFilterHelper = Private(require('ui/kibi/helpers/join_filter_helper/join_filter_helper'));
    var countHelper      = Private(require('ui/kibi/helpers/count_helper/count_helper'));

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
                this.joinSeqFilter.meta.alias = button.filterLabel
                .replace(/\$COUNT/g, this.sourceCount)
                .replace(/\$DASHBOARD/g, urlHelper.getCurrentDashboardId());
              } else {
                this.joinSeqFilter.meta.alias = '... related to (' + this.sourceCount + ') from ' + urlHelper.getCurrentDashboardId();
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
    //            bool: {
    //              must: {},
    //              must_not: [],
    //              filter: {
    //                bool: {
    //                  must: []
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
    RelationVisHelper.prototype.buildNewJoinSeqFilter = function (button, savedSearchMeta) {
      return this._getRelation(button, savedSearchMeta).then(function (relation) {

        var label = 'First join_seq filter ever';
        return {
          meta: {
            alias: label
          },
          join_sequence: [relation]
        };

      });
    };


    RelationVisHelper.prototype.addRelationToJoinSeqFilter = function (button, savedSearchMeta, joinSeqFilter) {
      var self = this;
      var joinSeqFiltersCloned = _.cloneDeep(joinSeqFilter);

      return this._getRelation(button, savedSearchMeta).then(function (relation) {
        self._negateLastElementOfTheSequenceIfFilterWasNegated(joinSeqFiltersCloned);
        joinSeqFiltersCloned.join_sequence.push(relation);
        // make sure that the new filter is not negated
        joinSeqFiltersCloned.meta.negate = false;
        return joinSeqFiltersCloned;
      });
    };


    RelationVisHelper.prototype.composeGroupFromExistingJoinFilters = function (joinSeqFilters) {
      var self = this;
      var groups = _.map(joinSeqFilters, function (f) {
        var joinSeqFiltersCloned = _.cloneDeep(f);
        self._negateLastElementOfTheSequenceIfFilterWasNegated(joinSeqFiltersCloned);
        return joinSeqFiltersCloned.join_sequence;
      });
      return { group: groups };
    };


    RelationVisHelper.prototype._negateLastElementOfTheSequenceIfFilterWasNegated = function (joinSeqFilter) {
      if (joinSeqFilter.meta && joinSeqFilter.meta.negate === true) {
        joinSeqFilter.join_sequence[joinSeqFilter.join_sequence.length - 1].negate = true;
      }
    };


    RelationVisHelper.prototype._getRelation = function (button, savedSearchMeta) {
      const ret = {
        relation: [
          {
            path: button.sourceField,
            indices: [button.sourceIndexPatternId],
            queries: [
              {
                query: {
                  bool: {
                    must: urlHelper.getCurrentDashboardQuery(),
                    // will be created below if needed
                    must_not: [],
                    filter: {
                      bool: {
                        must: []
                      }
                    }
                  }
                }
              }
            ],
            // default siren-join parameters
            orderBy: 'default'
          },
          {
            path: button.targetField,
            indices: [button.targetIndexPatternId],
            // default siren-join parameters
            orderBy: 'default'
          }
        ]
      };

      joinFilterHelper.addAdvancedJoinSettingsToRelation(
        button.sourceIndexPatternId + '/' + button.sourceField,
        button.targetIndexPatternId + '/' + button.targetField,
        ret.relation
      );

      var sourceFilters = _.filter(urlHelper.getCurrentDashboardFilters(), function (f) {
        // all except join_sequence
        return !f.join_sequence;
      });

      // add filters and query from saved search
      if (savedSearchMeta.query && !kibiStateHelper.isAnalyzedWildcardQueryString(savedSearchMeta.query)) {
        ret.relation[0].queries.push(savedSearchMeta.query);
      }
      if (savedSearchMeta.filter && savedSearchMeta.filter.length > 0) {
        sourceFilters = sourceFilters.concat(savedSearchMeta.filter);
      }

      // check all filters - remove meta and push to must or must not depends on negate flag
      _.each(sourceFilters, function (f) {
        if (f.meta && f.meta.negate === true) {
          delete f.meta;
          delete f.$state;
          ret.relation[0].queries[0].query.bool.must_not.push(f);
        } else if (f.meta) {
          delete f.meta;
          delete f.$state;
          ret.relation[0].queries[0].query.bool.filter.bool.must.push(f);
        }
      });


      // update the timeFilter
      return indexPatterns.get(button.sourceIndexPatternId).then(function (indexPattern) {
        var sourceTimeFilter = timefilter.get(indexPattern);
        if (sourceTimeFilter) {
          var sourceDashboardId = urlHelper.getCurrentDashboardId();
          return kibiTimeHelper.updateTimeFilterForDashboard(sourceDashboardId, sourceTimeFilter).then(function (updatedTimeFilter) {
            // add time filter
            ret.relation[0].queries[0].query.bool.filter.bool.must.push(updatedTimeFilter);
            return ret;
          });
        } else {
          return ret;
        }
      });
    };


    RelationVisHelper.prototype.buildCountQuery = function (targetDashboardId, joinSeqFilter) {
      // in case relational panel is enabled at the same time
      // as buttons take care about extra filters and queries from
      // dashboards based on the same index
      var promises = [
        urlHelper.getDashboardAndSavedSearchMetas([ targetDashboardId ]),
        urlHelper.getQueriesFromDashboardsWithSameIndex(targetDashboardId),
        urlHelper.getFiltersFromDashboardsWithSameIndex(targetDashboardId)
      ];
      return Promise.all(promises).then(function (results) {
        var [ { savedDash, savedSearchMeta } ] = results[0];
        var queriesFromDashboardsWithSameIndex = results[1] || [];
        var filtersFromDashboardsWithSameIndex = results[2] || [];
        if (joinSeqFilter) {
          filtersFromDashboardsWithSameIndex = filtersFromDashboardsWithSameIndex.concat(joinSeqFilter);
        }
        return countHelper.constructCountQuery(
          savedDash,
          savedSearchMeta,
          null,  // do not put joinSeqFilter here as this parameter is reserved to join_set only !!!
          queriesFromDashboardsWithSameIndex,
          filtersFromDashboardsWithSameIndex
        )
        .then(function (query) {
          return {
            query: query,
            index: savedSearchMeta.index
          };
        });
      });
    };


    return new RelationVisHelper();
  };

});
