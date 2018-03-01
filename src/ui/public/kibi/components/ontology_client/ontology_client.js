import _ from 'lodash';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana/ontology_client')
.service('ontologyClient', function (Private, queryEngineClient, createNotifier, savedDashboards, savedSearches) {
  const notify = createNotifier({
    location: 'Kibi Ontology Client'
  });

  const defaultKibiNs = 'http://siren.io/model#';

  const schemaMaxAge = 10000; // 10 seconds
  let schemaVersion;

  function OntologyClient() {
    this._cachedEntityRanges = {};
    this._cachedEntitiesMap = {};
    this._cachedRelationsMap = {};
  }

  OntologyClient.prototype._encodeUrl = function (str) {
    return encodeURIComponent(str)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/%20/g, '+');
  };

  OntologyClient.prototype._decodeUrl = function (str) {
    const encodedUrl = str
    .replace(/%21/g, '!')
    .replace(/%27/g, '\'')
    .replace(/'%28'/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2A/g, '*')
    .replace(/\+/g, '%20');
    return decodeURIComponent(encodedUrl);
  };

  OntologyClient.prototype._removeNs = function (str) {
    const value = str.replace(defaultKibiNs, '');
    return value;
  };

  OntologyClient.prototype._removeNsDecode = function (str) {
    if (!str) {
      return str;
    }
    const value = this._removeNs(str);
    return this._decodeUrl(value);
  };

  /*
   * Returns the list of available relations.
   */
  OntologyClient.prototype.getRelations = _.throttle(function () {
    return this._isCachedModelOutdated()
    .then((isOutDated) => {
      if (!isOutDated && this._cachedRelationsList) {
        const clonedRelations = _.cloneDeep(this._cachedRelationsList);
        return Promise.resolve(clonedRelations);
      } else {
        return queryEngineClient.schemaQuery({
          path: '/schema/relations',
          method: 'GET'
        })
        .then((res) => {
          if (res.status !== 200) {
            Promise.reject(new Error('Failed to retrieve relations from the schema. An error has occurred.'));
          } else if (res.data) {
            const relations = _.reduce(res.data, (relationsArray, rel) => {
              rel.id = this._removeNsDecode(rel.id);
              rel.domain.id = this._removeNsDecode(rel.domain.id);
              rel.range.id = this._removeNsDecode(rel.range.id);
              if (rel.inverseOf) {
                rel.inverseOf = this._removeNsDecode(rel.inverseOf);
              }

              relationsArray.push(rel);
              return relationsArray;
            }, []);

            this._cachedRelationsList = relations;
            return _.cloneDeep(relations);
          }
          Promise.reject(new Error('Failed to retrieve relations from the schema. No data retrieved.'));
        })
        .catch(notify.error);
      }
    });
  }, 200);

  /*
   * Returns a relation by id.
   */
  OntologyClient.prototype.getRelationById = function (relationId) {
    return this._isCachedModelOutdated()
    .then((isOutDated) => {
      if (!isOutDated && this._cachedRelationsMap[relationId]) {
        const clonedRelation = _.cloneDeep(this._cachedRelationsMap[relationId]);
        return Promise.resolve(clonedRelation);
      } else {
        return this.getRelations()
        .then((relations) => {
          const relation = _.find(relations, (rel) => { return rel.id === relationId; });
          if (relation) {
            this._cachedRelationsMap[relationId] = relation;
          }
          return relation;
        });
      }
    });
  };

  /*
   * Returns a list of ranges for a given entity id. The objects returned in the list have the type too.
   * Eg: [{ id: 'Article', type: 'INDEX_PATTERN' }]
   */
  OntologyClient.prototype.getRangesForEntityId = function (entityId) {
    return this._isCachedModelOutdated()
    .then((isOutDated) => {
      if (!isOutDated && this._cachedEntityRanges[entityId]) {
        const clonedRanges = _.cloneDeep(this._cachedEntityRanges[entityId]);
        return Promise.resolve(clonedRanges);
      } else {
        return this.getRelations()
        .then((relations) => {
          const ranges = _.reduce(relations, (total, relation) => {
            if (relation.domain.id === entityId) {
              total.push({
                id: relation.range.id,
                type: relation.range.type
              });
            }
            return total;
          }, []);
          this._cachedEntityRanges[entityId] = ranges;
          return ranges;
        });
      }
    });
  };

  /*
   * Returns a list of relations having the given entity id as domain.
   */
  OntologyClient.prototype.getRelationsByDomain = function (domainId) {
    return this.getRelations()
    .then((relations) => {
      const filteredRelations = _.filter(relations, (rel) => {
        return rel.domain.id === domainId;
      });
      return filteredRelations;
    });
  };

  /*
   * Returns the list of relation labels (unique values)
   */
  OntologyClient.prototype.getUniqueRelationLabels = function () {
    return this.getRelations()
    .then((relations) => {
      const relationLabelsSet = _.reduce(relations, (total, rel) => {
        total.add(rel.directLabel);
        total.add(rel.inverseLabel);
        return total;
      }, new Set());
      return Array.from(relationLabelsSet);
    });
  };

  /*
   * Returns the list of relation label pairs (unique values)
   */
  OntologyClient.prototype.getUniqueRelationLabelPairs = function () {
    return this.getRelations()
    .then((relations) => {
      const relationLabelsSet = _.reduce(relations, (total, rel) => {
        total.add({
          directLabel : rel.directLabel,
          inverseLabel: rel.inverseLabel
        });
        return total;
      }, new Set());
      return Array.from(relationLabelsSet);
    });
  };

  /*
   *
   */
  OntologyClient.prototype.getUniqueFieldDescriptions = function () {
    return this.getRelations()
    .then((relations) => {
      const fieldDescriptions = _.reduce(relations, (total, rel) => {
        if (rel.domain.fieldDescr) {
          total.push(rel.domain.fieldDescr);
        } else if (rel.range.fieldDescr) {
          total.push(rel.range.fieldDescr);
        }
        return total;
      }, new Set());
      return Array.from(fieldDescriptions);
    });
  };

  /*
   * Returns the list of available entities.
   */
  OntologyClient.prototype.getEntities = _.throttle(function () {
    return this._isCachedModelOutdated()
    .then((isOutDated) => {
      if (!isOutDated && this._cachedEntitiesList) {
        const clonedEntities = _.cloneDeep(this._cachedEntitiesList);
        return Promise.resolve(clonedEntities);
      } else {
        return queryEngineClient.schemaQuery({
          path: '/schema/entities',
          method: 'GET'
        })
        .then((res) => {
          if (res.status !== 200) {
            Promise.reject(new Error('Failed to retrieve entities from the schema. An error has occurred.'));
          } else if (res.data) {
            const entities = _.reduce(res.data, (total, entity) => {
              entity.instanceLabel = {};
              entity.id = this._removeNsDecode(entity.id);
              if (entity.longDescription) {
                entity.longDescription = this._removeNsDecode(entity.longDescription);
              }
              if (entity.label) {
                entity.label = entity.label.substring(0, entity.label.lastIndexOf('@'));
              }
              if (entity.instanceLabelType) {
                entity.instanceLabel.type = entity.instanceLabelType;
              }
              if (entity.instanceLabelValue) {
                entity.instanceLabel.value = entity.instanceLabelValue;
              }

              total.push(entity);
              return total;
            }, []);
            this._cachedEntitiesList = entities;
            return _.cloneDeep(entities);
          }
          Promise.reject(new Error('Failed to retrieve entities from the schema. No data retrieved.'));
        })
        .catch(notify.error);
      }
    });
  }, 200);

  /*
   * Returns an entity by id.
   */
  OntologyClient.prototype.getEntityById = function (entityId) {
    return this._isCachedModelOutdated()
    .then((isOutDated) => {
      if (!isOutDated && this._cachedEntitiesMap[entityId]) {
        const clonedEntity = _.cloneDeep(this._cachedEntitiesMap[entityId]);
        return Promise.resolve(clonedEntity);
      } else {
        return this.getEntities()
        .then((entities) => {
          const entity = _.find(entities, (entity) => { return entity.id === entityId; });
          if (entity) {
            this._cachedEntitiesMap[entity.id] = entity;
          }
          return entity;
        });
      }
    });
  };

  /*
   * Returns a list of dashboards that can be the target of a join for the given entity id.
   */
  OntologyClient.prototype.getDashboardsByEntity = function (entity) {
    return this.getRangesForEntityId(entity.id)
    .then((ranges) => {
      const indexPatterns = new Set(_.map(ranges, 'id'));
      return savedDashboards.find()
      .then(function (dashboards) {
        const promises = _.map(dashboards.hits, (dashboard) => {
          return savedSearches.get(dashboard.savedSearchId)
          .then((savedSearch) => {
            if (savedSearch.kibanaSavedObjectMeta && savedSearch.kibanaSavedObjectMeta.searchSourceJSON) {
              const index = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON).index;
              if (indexPatterns.has(index)) {
                return dashboard;
              }
            }
          });
        });
        return Promise.all(promises)
        .then((dashboards) => {
          return _.filter(dashboards, (dashboard) => {
            return !!dashboard;
          });
        });
      });
    });
  };

  /*
   * Inserts a list of relations into the relational model.
   */
  OntologyClient.prototype.insertRelations = function (relations) {
    if (relations.length) {
      return this._executeSchemaUpdateAndClearCache({
        path: '/schema/relations',
        method: 'POST',
        data: relations
      });
    } else {
      return Promise.resolve();
    }
  };

  /*
   * Inserts an entity into the relational model.
   * The passed fields must not be already encoded. If this is the case use <insertEncodedEntity> instead.
   * Supported types: INDEX_PATTERN or VIRTUAL_ENTITY
   */
  OntologyClient.prototype.insertEntity = function (id, label, type, icon, color, shortDescription, longDescription,
    instanceLabelType, instanceLabelValue) {
    const entity = {
      id: this._encodeUrl(id),
      label: label,
      type: type,
      icon: icon,
      color: color,
      shortDescription: shortDescription,
      instanceLabelType: instanceLabelType,
      instanceLabelValue: instanceLabelValue
    };
    if (longDescription) {
      entity.longDescription = this._encodeUrl(longDescription);
    }
    return this.insertEncodedEntity(entity);
  };

  /*
   * Inserts an entity into the relational model. This entity object should have the relevant fields already encoded.
   * Look at the <insertEntity> function to see the fields that need encoding.
   */
  OntologyClient.prototype.insertEncodedEntity = function (entity) {
    if (!entity.id) {
      return Promise.reject('Missing entity id');
    } else {
      return this._executeSchemaUpdateAndClearCache({
        path: '/schema/entity/' + entity.id,
        method: 'POST',
        data: entity
      });
    }
  };

  /*
   * Executes the passed SPARQLE UPDATE query.
   */
  OntologyClient.prototype.updateWithQuery = function (query) {
    if (query) {
      return this._executeSchemaUpdateAndClearCache({
        path: '/schema/update',
        method: 'POST',
        data: { query: query }
      });
    } else {
      return Promise.reject('You are trying to issue a SPARQL update with an empty query');
    }
  };

  /**
   * Updates the properties of an entity.
   */
  OntologyClient.prototype.updateEntity = function (entity) {
    const clonedEntity = _.cloneDeep(entity);
    clonedEntity.id = this._encodeUrl(clonedEntity.id);
    if (clonedEntity.longDescription) {
      clonedEntity.longDescription = this._encodeUrl(clonedEntity.longDescription);
    }
    return this._executeSchemaUpdateAndClearCache({
      path: '/schema/entity/' + clonedEntity.id,
      method: 'PUT',
      data: clonedEntity
    });
  };

  /*
   * Delete an entity by id.
   */
  OntologyClient.prototype.deleteEntity = function (entityId) {
    return this._executeSchemaUpdateAndClearCache({
      path: '/schema/entity/' + this._encodeUrl(entityId),
      method: 'DELETE'
    });
  };

  /*
   * Delete all relations having the passed entity as domain or range.
   */
  OntologyClient.prototype.deleteByDomainOrRange = function (entityId) {
    return this._executeSchemaUpdateAndClearCache({
      path: '/schema/relationByDomainOrRange/' + this._encodeUrl(entityId),
      method: 'DELETE'
    });
  };

  /*
   * Executes the query. The type param can be 'QUERY' or 'UPDATE'.
   */
  OntologyClient.prototype._executeSchemaUpdateAndClearCache = function (options) {
    const params = {
      path: options.path,
      method: options.method
    };
    if (options.data) {
      params.data = options.data;
    }

    return queryEngineClient.schemaUpdate(params)
    .then(() => {
      this.clearCache();
    })
    .catch(notify.error);
  };

  /*
   * Check if the underlying ontology schema has been updated.
   */
  OntologyClient.prototype._isCachedModelOutdated = _.throttle(function () {
    return queryEngineClient.schemaQuery({
      path: '/schema/getSchemaVersion',
      method: 'GET'
    })
    .then((res) => {
      if (res.data && res.data.version !== schemaVersion) {
        schemaVersion = res.data.version;
        this.clearCache();
        return true;
      } else {
        return false;
      }
    })
    .catch(notify.error);
  }, schemaMaxAge);

  /**
   * Clears all the cached objects.
   */
  OntologyClient.prototype.clearCache = function () {
    this._cachedEntitiesList = null;
    this._cachedEntitiesMap = {};
    this._cachedRelationsList = null;
    this._cachedEntityRanges = {};
    this._cachedRelationsMap = {};
  };

  return new OntologyClient();
});
