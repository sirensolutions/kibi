import _ from 'lodash';

export function RelationsHelperFactory(config, ontologyClient) {
  const SEPARATOR = '/';

  const checkIdFormat = function (parts) {
    return parts && parts.length === 6;
  };

  class RelationsHelper {
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
      return ontologyClient.getRelationById(relationId)
      .then((relation) => {
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
          return rel;
        }

        if (relation.timeout && relation.timeout > 0) {
          rel.task_timeout = relation.timeout;
        } else if (defaultJoinTaskTimeout > 0) {
          rel.task_timeout = defaultJoinTaskTimeout;
        }

        return rel;
      });
    }
  }

  return new RelationsHelper();
};
