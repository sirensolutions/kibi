import { RelationsHelperFactory } from 'ui/kibi/helpers/relations_helper';
import { QueryBuilderFactory } from 'ui/kibi/helpers/query_builder';
import _ from 'lodash';

export function KibiSequentialJoinVisHelperFactory(savedDashboards, kbnUrl, kibiState, Private, kibiMeta, Promise, createNotifier) {
  const queryBuilder = Private(QueryBuilderFactory);
  const relationsHelper = Private(RelationsHelperFactory);

  const notify = createNotifier({
    location: 'Kibi Sequential Join Vis'
  });

  function KibiSequentialJoinVisHelper() {}

  KibiSequentialJoinVisHelper.prototype.constructButtonsArray = function (buttonDefs, currentDashboardIndexId,
                                                                          currentDashboardId, dashboardIdIndexPair,
                                                                          relations) {
    return _.chain(buttonDefs)
    .filter(function (buttonDef) {
      // if sourceDashboardId is defined keep only the one which match
      if (buttonDef.sourceDashboardId && currentDashboardId) {
        return buttonDef.sourceDashboardId === currentDashboardId;
      }
      const relation = _.find(relations, 'id', buttonDef.indexRelationId);
      if (!relation) {
        throw new Error(`Couldn't find a relation with id: ${buttonDef.indexRelationId}`);
      }
      // filter it out if currentDashboardIndex is neither in source nor in target for the button relation
      if (currentDashboardIndexId &&
          currentDashboardIndexId !== relation.domain.id &&
          currentDashboardIndexId !== relation.range.id) {
        return false;
      }
      // filter if targetDashboardId == currentDashboardId
      // the button should be shown only if it is based on a self join relation
      if (currentDashboardId && currentDashboardId === buttonDef.targetDashboardId) {
        return relation.domain.id === relation.range.id;
      }
      if (buttonDef.type !== 'VIRTUAL_ENTITY' &&
          dashboardIdIndexPair && currentDashboardIndexId === relation.domain.id &&
          dashboardIdIndexPair.get(buttonDef.targetDashboardId) !== relation.range.id) {
        return false;
      }
      if (dashboardIdIndexPair && currentDashboardIndexId === relation.range.id &&
          dashboardIdIndexPair.get(buttonDef.targetDashboardId) !== relation.domain.id) {
        return false;
      }
      return true;
    })
    .map(function (button) {
      if (button.indexRelationId && currentDashboardIndexId) {
        const relation = _.find(relations, 'id', button.indexRelationId);
        if (relation.domain.id === currentDashboardIndexId) {
          button.sourceIndexPatternId = relation.domain.id;
          button.sourceField = relation.domain.field;
          button.targetIndexPatternId = relation.range.id;
          button.targetField = relation.range.field;
        } else {
          button.sourceIndexPatternId = relation.range.id;
          button.sourceField = relation.range.field;
          button.targetIndexPatternId = relation.domain.id;
          button.targetField = relation.domain.field;
        }
      }
      return button;
    })
    .map((buttonDef) => {
      const button = _.clone(buttonDef);

      this.addClickHandlerToButton(button);
      return button;
    }).value();
  };

  KibiSequentialJoinVisHelper.prototype.addClickHandlerToButton = function (button) {
    button.click = function (updateOnClick = false) {
      let alias = button.filterLabel || '... related to ($COUNT) from $DASHBOARD';
      const currentDashboardId = kibiState._getCurrentDashboardId();

      if (!currentDashboardId) {
        return Promise.resolve();
      }
      let dashboardTitle = Promise.resolve();
      if (_.contains(alias, '$DASHBOARD')) {
        dashboardTitle = savedDashboards.find().then(dashboards => _.get(_.find(dashboards.hits, 'id', currentDashboardId), 'title'));
      }
      return Promise.all([
        dashboardTitle,
        kibiState.saveAppState()
      ]).then(([ title ]) => {
        if (button.joinSeqFilter) {
          const switchToDashboard = function () {
            // add join_seq Filter
            kibiState.addFilter(button.targetDashboardId, button.joinSeqFilter);
            // switch to target dashboard
            if (button.targetDashboardId && button.targetDashboardId !== currentDashboardId) {
              // do not emit an event on save when switching to a different dashboard
              // since this would trigger unwanted listeners
              kibiState.save(false, true);
              kbnUrl.change('/dashboard/{{id}}', { id: button.targetDashboardId });
            } else {
              kibiState.save();
            }
          };

          // create the alias for the filter
          alias = alias.replace(/\$DASHBOARD/g, title);
          alias = alias.replace(/\$COUNT/g, button.targetCount);
          button.joinSeqFilter.meta.alias = alias;
          switchToDashboard.apply(button);
        } else {
          button.joinSeqFilter.meta.alias_tmpl = '';
          // just redirect to the target dashboard
          if (button.targetDashboardId) {
            kbnUrl.change('/dashboard/{{id}}', { id: button.targetDashboardId });
          }
        }
      });
    };
  };

  KibiSequentialJoinVisHelper.prototype.getJoinSequenceFilter = function (dashboardId, button) {
    // check that there are any join_seq filters already on this dashboard
    //    if there is 0:
    //      create new join_seq filter with 1 relation from current dashboard to target dashboard
    //    if there is only 1:
    //      take the join_sequence filter and add to the sequence
    //      - new relation from current dashboard to target dashboard
    //    if there is more then 1:
    //      create join_sequence filter with:
    //      - group from all existing join_seq filters and add this group at the top
    //      - new relation from current dashboard to target dashboard

    return Promise.all([
      kibiState.timeBasedIndices(button.sourceIndexPatternId, dashboardId),
      kibiState.timeBasedIndices(button.targetIndexPatternId, button.targetDashboardId),
      kibiState.getState(dashboardId)
    ])
    .then(([ sourceIndices, targetIndices, { filters, queries, time } ]) => {
      const existingJoinSeqFilters = _.filter(filters, (filter) => filter.join_sequence);
      const remainingFilters = _.filter(filters, (filter) => !filter.join_sequence);

      if (existingJoinSeqFilters.length === 0) {
        return this.buildNewJoinSeqFilter({
          sourceIndices,
          targetIndices,
          button,
          filters: remainingFilters,
          queries,
          time
        });
      } else if (existingJoinSeqFilters.length === 1) {
        const joinSeqFilter = existingJoinSeqFilters[0];
        return this.addRelationToJoinSeqFilter({
          sourceIndices,
          targetIndices,
          button,
          filters: remainingFilters,
          queries,
          time,
          joinSeqFilter
        });
      } else {
        // build join sequence + add a group of sequances to the top of the array
        return this.buildNewJoinSeqFilter({
          sourceIndices,
          targetIndices,
          button,
          filters: remainingFilters,
          queries,
          time
        })
        .then((joinSeqFilter) => {
          // here create a group from existing ones and add it on the top
          const group = this.composeGroupFromExistingJoinFilters(existingJoinSeqFilters);
          joinSeqFilter.join_sequence.unshift(group);
          return joinSeqFilter;
        });
      }
    });
  };

  // The join_sequence should not contain the join_set. The join_set is supposed to be a singleton in Kibi.
  //
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
  KibiSequentialJoinVisHelper.prototype.buildNewJoinSeqFilter = function ({ sourceIndices, targetIndices, button, filters, queries,
                                                                          time }) {
    return this._getRelation({ sourceIndices, targetIndices, button, filters, queries, time })
    .then((relation) => {
      const label = 'First join_seq filter ever';

      return {
        meta: {
          alias: label,
          version: 2
        },
        join_sequence: [ relation ]
      };
    });
  };

  KibiSequentialJoinVisHelper.prototype.addRelationToJoinSeqFilter = function ({ sourceIndices, targetIndices, button, filters, queries,
                                                                               time, joinSeqFilter }) {
    const joinSeqFiltersCloned = _.cloneDeep(joinSeqFilter);
    return this._getRelation({ sourceIndices, targetIndices, button, filters, queries, time })
    .then((relation) => {
      this._negateLastElementOfTheSequenceIfFilterWasNegated(joinSeqFiltersCloned);
      joinSeqFiltersCloned.join_sequence.push(relation);
      // make sure that the new filter is not negated
      joinSeqFiltersCloned.meta.negate = false;
      return joinSeqFiltersCloned;
    });
  };

  KibiSequentialJoinVisHelper.prototype.composeGroupFromExistingJoinFilters = function (joinSeqFilters) {
    const self = this;
    const groups = _.map(joinSeqFilters, function (f) {
      const joinSeqFiltersCloned = _.cloneDeep(f);
      self._negateLastElementOfTheSequenceIfFilterWasNegated(joinSeqFiltersCloned);
      return joinSeqFiltersCloned.join_sequence;
    });
    return { group: groups };
  };

  KibiSequentialJoinVisHelper.prototype._negateLastElementOfTheSequenceIfFilterWasNegated = function (joinSeqFilter) {
    if (joinSeqFilter.meta && joinSeqFilter.meta.negate === true) {
      joinSeqFilter.join_sequence[joinSeqFilter.join_sequence.length - 1].negate = true;
    }
  };

  KibiSequentialJoinVisHelper.prototype._getRelation = function ({ sourceIndices, targetIndices, button, filters, queries, time }) {
    const ret = {
      relation: [
        {
          pattern: button.sourceIndexPatternId,
          path: button.sourceField,
          indices: sourceIndices,
          // default siren-vanguard parameters
          termsEncoding: 'long'
        },
        {
          pattern: button.targetIndexPatternId,
          path: button.targetField,
          indices: targetIndices,
          // default siren-vanguard parameters
          termsEncoding: 'long'
        }
      ]
    };

    return relationsHelper.addAdvancedJoinSettingsToRelation(ret, button.indexRelationId)
    .then((ret) => {
      ret.relation[0].queries = [ queryBuilder(filters, queries, time) ];
      return ret;
    });
  };

  KibiSequentialJoinVisHelper.prototype.buildCountQuery = function (targetDashboardId, joinSeqFilter) {
    // in case relational panel is enabled at the same time
    // as buttons take care about extra filters and queries from
    // dashboards based on the same index
    return kibiState.getState(targetDashboardId)
    .then(function ({ filters, queries, time }) {
      if (joinSeqFilter) {
        filters.push(joinSeqFilter);
      }
      const query = queryBuilder(filters, queries, time);
      query.size = 0; // we do not need hits just a count
      return query;
    });
  };

  KibiSequentialJoinVisHelper.prototype.constructSubButton = function (parentButton, dashboard, relation) {
    return {
      id: relation.id + '-ip-' + dashboard.title,
      indexRelationId: parentButton.indexRelationId,
      label: dashboard.title,
      sourceDashboardId: parentButton.sourceDashboardId,
      sourceField: parentButton.sourceField,
      sourceIndexPatternId: parentButton.sourceIndexPatternId,
      targetDashboardId: dashboard.id,
      targetField: relation.range.field,
      targetIndexPatternId: relation.range.id,
      type: 'INDEX_PATTERN'
    };
  };

  return new KibiSequentialJoinVisHelper();
};
