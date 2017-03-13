define(function (require) {
  return function RelationsHelperFactory(kibiEnterpriseEnabled, config, $rootScope) {
    const SEPARATOR = '/';

    const _ = require('lodash');
    let relations;

    function RelationsHelper() {}

    $rootScope.$on('change:config.kibi:relations', (event, newRelations) => {
      if (newRelations) {
        relations = newRelations;
      }
    });

    $rootScope.$on('init:config', () => {
      relations = config.get('kibi:relations');
    });

    $rootScope.$on('change:config', () => {
      relations = config.get('kibi:relations');
    });

    const checkIdFormat = function (parts) {
      return parts && parts.length === 6;
    };

    /**
     * validateDashboardsRelation validates the given relation between two dashboards
     *
     * @param relation the relation between dashboards
     * @returns true if the relation is ok
     */
    RelationsHelper.prototype.validateDashboardsRelation = function (relation, relationsToCheck) {
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
    };

    /**
     * validateIndicesRelationFromId validates the given ID of a relation between indices
     *
     * @param relationId the ID of the relation
     * @returns true if the relation exists and is ok
     */
    RelationsHelper.prototype.validateIndicesRelationFromId = function (relationId) {
      if (!relationId) {
        throw new Error('relationId cannot be undefined');
      }

      const relation = _.find(relations.relationsIndices, 'id', relationId);
      return Boolean(relation && this.validateIndicesRelation(relation));
    };

    /**
     * validateIndicesRelation validates the given relation between two indices
     *
     * @param relation the relation between indices
     * @returns true if the relation is ok
     */
    RelationsHelper.prototype.validateIndicesRelation = function (relation) {
      // the id should have 6 parts
      if (!relation.id) {
        return false;
      }
      const parts = relation.id.split(SEPARATOR);
      if (!checkIdFormat.call(this, parts)) {
        return false;
      }
      // label should be defined
      if (!relation.label) {
        return false;
      }
      // check the indices relation
      if (relation.indices.length !== 2) {
        return false;
      }
      const leftIndex = relation.indices[0];
      const rightIndex = relation.indices[1];
      if (!leftIndex.indexPatternId || !leftIndex.path) {
        return false;
      }
      if (!rightIndex.indexPatternId || !rightIndex.path) {
        return false;
      }

      /**
       * @retval true if @a and @b are strictly equal or are both empty
       * @retval false if not.
       */
      const areEqual = (a, b) => a === b || _.isEmpty(a) && _.isEmpty(b);

      // test if the ID is correct
      const checkID = function (leftIndex, rightIndex, parts) {
        return leftIndex.indexPatternId === parts[0] &&
          areEqual(leftIndex.indexPatternType, parts[1]) &&
          leftIndex.path === parts[2] &&
          rightIndex.indexPatternId === parts[3] &&
          areEqual(rightIndex.indexPatternType, parts[4]) &&
          rightIndex.path === parts[5];
      };
      if (!checkID(leftIndex, rightIndex, parts) && !checkID(rightIndex, leftIndex, parts)) {
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
    RelationsHelper.prototype.checkIfRelationsAreValid = function (relationsToCheck) {
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
    };

    /**
     * Returns a unique identifier for the relation between the indices indexa and indexb
     */
    RelationsHelper.prototype.getJoinIndicesUniqueID = function (indexPatternIda, indexPatternTypea, patha,
                                                                 indexPatternIdb, indexPatternTypeb, pathb) {
      const clean = function (str) {
        return str.replace(/\//, '-slash-');
      };

      const ia = `${clean(indexPatternIda)}/${clean(indexPatternTypea || '')}/${clean(patha)}`;
      const ib = `${clean(indexPatternIdb)}/${clean(indexPatternTypeb || '')}/${clean(pathb)}`;
      return ia < ib ? ia + SEPARATOR + ib : ib + SEPARATOR + ia;
    };

    /**
     * getRelationInfosFromRelationID returns the index, type, and path of the relation's source,
     * and the index, type, and path of the relation's target, given its ID.
     *
     * @param relationId the ID of the relation as computed with RelationsHelper.getJoinIndicesUniqueID
     * @returns an object with source and target fields.
     */
    RelationsHelper.prototype.getRelationInfosFromRelationID = function (relationId) {
      const restore = function (str) {
        return str.replace('-slash-', SEPARATOR);
      };

      const parts = relationId.split(SEPARATOR);
      if (parts.length !== 6) {
        throw new Error(`Got badly formatted relation ID: ${relationId}`);
      }
      return {
        source: {
          index: restore(parts[0]),
          type: restore(parts[1]),
          path: restore(parts[2])
        },
        target: {
          index: restore(parts[3]),
          type: restore(parts[4]),
          path: restore(parts[5])
        }
      };
    };

    /**
     * Create the human readable label from given relation id
     * the targetIndexId parameter tells the direction of the label
     * This method is used in sequential join filter visualisation configuration
     */
    RelationsHelper.prototype.createMoreDetailedLabel = function (relationId, targetIndexId) {
      const rel = this.getRelationInfosFromRelationID(relationId);
      if (targetIndexId === rel.target.index) {
        return rel.source.index + '/' +
               (rel.source.type ? rel.source.type + '/' : '') +
               rel.source.path + ' <-> ' +
               rel.target.index + '/' +
               (rel.target.type ? rel.target.type + '/' : '') +
               rel.target.path;
      }
      return rel.target.index + '/' +
             (rel.target.type ? rel.target.type + '/' : '') +
             rel.target.path + ' <-> ' +
             rel.source.index + '/' +
             (rel.source.type ? rel.source.type + '/' : '') +
             rel.source.path;
    };

    /**
     * Adds advanced join parameters for the given relation.
     * Rel is an array with the following format:
     *     [
     *       { indices: [ 'index1' ], types: [ 'type1' ], path: 'id1' },
     *       { indices: [ 'index2' ], types: [ 'type2' ], path: 'id2' }
     *     ]
     * The types field is optional.
     */
    RelationsHelper.prototype.addAdvancedJoinSettingsToRelation = function (rel, sourceIndexPatternId, targetIndexPatternId) {
      if (!relations || !relations.relationsIndices) {
        // not initialized yet
        return true;
      }
      if (kibiEnterpriseEnabled) {
        const relationPart = function (indexPatternId, relPart) {
          let label = (indexPatternId || relPart.indices[0]) + SEPARATOR;

          if (relPart.types) {
            label += relPart.types[0];
          }
          return label + SEPARATOR + relPart.path;
        };

        const advKeys = [ 'termsEncoding', 'orderBy', 'maxTermsPerShard' ];

        // get indices relations
        const relationsIndices = relations.relationsIndices;

        if (!relationsIndices.length) {
          return;
        }

        const sourcePartOfTheRelationId = relationPart(sourceIndexPatternId, rel[0]);
        const targetPartOfTheRelationId = relationPart(targetIndexPatternId, rel[1]);
        // copying advanced options from corresponding index relation
        let forward = true;
        let relationId = sourcePartOfTheRelationId + SEPARATOR + targetPartOfTheRelationId;
        let indexRelation = _.find(relationsIndices, (r) => relationId === r.id);
        if (!indexRelation) {
          forward = false;
          // try to find the relation in other direction
          relationId = targetPartOfTheRelationId + SEPARATOR + sourcePartOfTheRelationId;
          indexRelation = _.find(relationsIndices, (r) => relationId === r.id);
          if (!indexRelation) {
            // at the moment, the relations settings are not mandatory to create a relational filter
            // therefore, this is only optional
            return;
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

    return new RelationsHelper();
  };

});
