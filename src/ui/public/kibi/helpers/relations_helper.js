define(function (require) {
  return function RelationsHelperFactory(kibiEnterpriseEnabled, config, $rootScope) {
    const _ = require('lodash');
    let relations = config.get('kibi:relations');

    function RelationsHelper() {}

    const kibiRelationsOff = $rootScope.$on('change:config.kibi:relations', (newRelations) => {
      if (newRelations) {
        relations = newRelations;
      }
    });

    RelationsHelper.prototype.destroy = function () {
      if (kibiRelationsOff) {
        kibiRelationsOff();
      }
    };

    /**
     * Returns a unique identifier for the relation between the indices indexa and indexb
     */
    RelationsHelper.prototype.getJoinIndicesUniqueID = function (indexPatternIda, indexPatternTypea, patha,
                                                                 indexPatternIdb, indexPatternTypeb, pathb) {
      const clean = function (str) {
        return str.replace(/\//, '-slash-');
      };

      var ia = `${clean(indexPatternIda)}/${clean(indexPatternTypea || '')}/${clean(patha)}`;
      var ib = `${clean(indexPatternIdb)}/${clean(indexPatternTypeb || '')}/${clean(pathb)}`;
      return ia < ib ? ia + '/' + ib : ib + '/' + ia;
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
        return str.replace('-slash-', '/');
      };

      const parts = relationId.split('/');
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
     * Adds advanced join parameters for the given relation.
     * Rel is an array with the following format:
     *     [
     *       { indices: [ 'index1' ], types: [ 'type1' ], path: 'id1' },
     *       { indices: [ 'index2' ], types: [ 'type2' ], path: 'id2' }
     *     ]
     * The types field is optional.
     */
    RelationsHelper.prototype.addAdvancedJoinSettingsToRelation = function (rel) {
      if (kibiEnterpriseEnabled) {
        const relationPart = function (relPart) {
          let label = relPart.indices[0] + '/';

          if (relPart.types) {
            label += relPart.types[0];
          }
          return label + '/' + relPart.path;
        };

        const advKeys = [ 'termsEncoding', 'orderBy', 'maxTermsPerShard' ];

        if (!relations) {
          // if relations is not defined during tests
          relations = config.get('kibi:relations');
          if (!relations) {
            return;
          }
        }
        // get indices relations
        const relationsIndices = relations.relationsIndices;

        if (!relationsIndices.length) {
          return;
        }

        const sourcePartOfTheRelationId = relationPart(rel[0]);
        const targetPartOfTheRelationId = relationPart(rel[1]);
        // copying advanced options from corresponding index relation
        let forward = true;
        let relationId = sourcePartOfTheRelationId + '/' + targetPartOfTheRelationId;
        let indexRelation = _.find(relationsIndices, (r) => relationId === r.id);
        if (!indexRelation) {
          forward = false;
          // try to find the relation in other direction
          relationId = targetPartOfTheRelationId + '/' + sourcePartOfTheRelationId;
          indexRelation = _.find(relationsIndices, (r) => relationId === r.id);
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

    return new RelationsHelper();
  };

});
