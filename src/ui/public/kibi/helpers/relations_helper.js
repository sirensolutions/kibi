import _ from 'lodash';

export function RelationsHelperFactory(config, ontologyClient) {
  const SEPARATOR = '/';
  let relations;

  const checkIdFormat = function (parts) {
    return parts && parts.length === 6;
  };

  class RelationsHelper {
    /**
     * Initializes the relations.
     */
    init() {
      ontologyClient.getRelations()
      .then((rels) => {
        relations = rels;
      })
    }
    /**
     * validateDashboardsRelation validates the given relation between two dashboards
     *
     * @param relation the relation between dashboards
     * @returns true if the relation is ok
     */
    validateDashboardsRelation(relation, relationsToCheck) {
      relationsToCheck = relationsToCheck || relations;

      if (relationsToCheck && relationsToCheck.relationsIndices) {
        // check if the relation exists and is unique
        const relationIndices = _.filter(relationsToCheck.relationsIndices, (relInd) => relInd.id === relation.relation);
        if (relationIndices.length !== 1) {
          return false;
        }
      } else {
        // basic test of the id format
        if (!relation.relation) {
          return false;
        }
        const parts = relation.relation.split(SEPARATOR);
        if (!checkIdFormat.call(this, parts)) {
          return false;
        }
      }
      // check the connected dashboards
      if (relation.dashboards.length !== 2) {
        return false;
      }
      if (!relation.dashboards[0] || !relation.dashboards[1]) {
        return false;
      }
      return true;
    }

    /**
     * validateRelationIdWithRelations validates the given ID of a relation between indices
     * against the provided relations.
     *
     * @param relationId the ID of the relation
     * @param relations the relations array
     * @returns true if the relation exists and is ok
     */
    validateRelationIdWithRelations(relationId, relations) {
      if (!relationId) {
        throw new Error('relationId cannot be undefined');
      }

      const relation = _.find(relations, 'id', relationId);
      return Boolean(relation && this.validateEntitiesRelation(relation));
    };

    /**
     * validateEntitiesRelation validates the given relation.
     *
     * @param relation the relation between indices
     * @returns true if the relation is ok
     */
    validateEntitiesRelation(relation) {
      // the id should have 6 parts
      if (!relation.id) {
        return false;
      }
      // label (which is the straight field) should be defined
      if (!relation.directLabel) {
        return false;
      }
      // check we have the domain and range of the relation
      if (!relation.domain || !relation.range || !relation.range.id) {
        return false;
      }

      return true;
    };

    /**
     * checkIfRelationsAreValid checks that the relations defined between dashboards and indices are ok
     *
     * @param relationsToCheck the indices/dashboards relations to check. If not passed, the relations are taken from the config
     * @returns an object { validIndices, validDashboards } where the fields are boolean
     */
    checkIfRelationsAreValid(relationsToCheck) {
      relationsToCheck = relationsToCheck || relations;

      if (!relationsToCheck || !relationsToCheck.relationsIndices || !relationsToCheck.relationsDashboards) {
        // not initialized yet
        return { validIndices: true, validDashboards: true };
      }

      return {
        // check that the indices relations are defined correctly
        validIndices: _.reduce(relationsToCheck.relationsIndices, (acc, rel) => {
          return acc && this.validateIndicesRelation(rel);
        }, true),
          // check the dashboard relations
        validDashboards: _.reduce(relationsToCheck.relationsDashboards, (acc, rel) => {
          return acc && this.validateDashboardsRelation(rel, relationsToCheck);
        }, true)
      };
    }

    /**
     * Returns a unique identifier for the relation between the indices indexa and indexb
     */
    getJoinIndicesUniqueID(indexPatternIda, patha, indexPatternIdb, pathb) {
      const clean = function (str) {
        return str.replace(/\//, '-slash-');
      };

      const ia = `${clean(indexPatternIda)}//${clean(patha)}`;
      const ib = `${clean(indexPatternIdb)}//${clean(pathb)}`;
      return ia < ib ? ia + SEPARATOR + ib : ib + SEPARATOR + ia;
    }

    /**
     * Adds advanced join parameters for the given relation.
     * Rel is an array with the following format:
     *
     *     {
     *       relation: {
     *         [
     *           { indices: [ 'index1' ], types: [ 'type1' ], path: 'id1' },
     *           { indices: [ 'index2' ], types: [ 'type2' ], path: 'id2' }
     *         ]
     *       }
     *     }
     *
     * The types field is optional.
     */
    addAdvancedJoinSettingsToRelation(rel, relationId) {
      if (!relations || !relations.length) {
        // not initialized yet
        return true;
      }

      let relation = _.find(relations, 'id', relationId);

      if (relation.joinType) {
        rel.type = relation.joinType;
      }

      let defaultJoinTaskTimeout = -1;
      try {
        defaultJoinTaskTimeout = parseInt(config.get('siren:joinTaskTimeout'), 10);
      } catch (e) {
        // ignore parsing error they should be handled when user is saving the value
      }

      if (relation.timeout === 0) {
        // allow to disable task_timeout for single relation when set to exactly zero
        return;
      }

      if (relation.timeout && relation.timeout > 0) {
        rel.task_timeout = relation.timeout;
      } else if (defaultJoinTaskTimeout > 0) {
        rel.task_timeout = defaultJoinTaskTimeout;
      }

    }
  }

  return new RelationsHelper();
};
