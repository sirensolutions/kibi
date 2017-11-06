import _ from 'lodash';
import { uiModules } from 'ui/modules';

uiModules
.get('kibana/ontology_client')
.service('ontologyClient', function (Private, queryEngineClient, createNotifier, savedDashboards, savedSearches) {
  const notify = createNotifier();

  const defaultKibiNs = 'http://siren.io/model#';

  function OntologyClient() {
    this._cachedEntityRanges = {};
    this._cachedEntitiesMap = {};
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
    const encodedUrl = str.replace(/%21/g, '!')
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
  OntologyClient.prototype.getRelations = function () {
    if (this._cachedRelationsList) {
      const clonedRelations = _.cloneDeep(this._cachedRelationsList);
      return Promise.resolve(clonedRelations);
    } else {
      return queryEngineClient.schema({
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
          return relations;
        }
        Promise.reject(new Error('Failed to retrieve relations from the schema. No data retrieved.'));
      });
    }
  };

  /*
   * Returns a list of ranges for a given entity id. The objects returned in the list have the type too.
   * Eg: [{ id: 'Article', type: 'INDEX_PATTERN' }]
   */
  OntologyClient.prototype.getRangesForEntityId = function (entityId) {
    if (this._cachedEntityRanges[entityId]) {
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
  };

  /*
   * Returns a list of relations having the given entity id as domain.
   */
  OntologyClient.prototype.getRelationsByDomain = function (domainId) {
    return this.getRelations()
    .then((relations) => {
      const filteredRelations = _.filter(relations, (rel) => {
        return rel.domain.indexPattern === domainId;
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
  OntologyClient.prototype.getEntities = function () {
    if (this._cachedEntitiesList) {
      const clonedEntities = _.cloneDeep(this._cachedEntitiesList);
      return Promise.resolve(clonedEntities);
    } else {
      return queryEngineClient.schema({
        path: '/schema/entities',
        method: 'GET'
      })
      .then((res) => {
        if (res.status !== 200) {
          Promise.reject(new Error('Failed to retrieve entities from the schema. An error has occurred.'));
        } else if (res.data) {
          const entities = _.reduce(res.data, (total, entity) => {
            entity.id = this._removeNsDecode(entity.id);
            entity.longDescr = this._removeNsDecode(entity.longDescr);

            total.push(entity);
            return total;
          }, []);
          this._cachedEntitiesList = entities;
          return entities;
        }
        Promise.reject(new Error('Failed to retrieve entities from the schema. No data retrieved.'));
      });
    }
  };

  /*
   * Returns an entity by id.
   */
  OntologyClient.prototype.getEntityById = function (entityId) {
    if (this._cachedEntitiesMap[entityId]) {
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
  };

  /*
   * Returns a list of dashboards that can be the target of a join for the given entity id.
   */
  OntologyClient.prototype.getDashboardsByEntity = function (entity) {
    return this.getRangesForEntityId(entity.indexPattern)
    .then((ranges) => {
      const indexPatterns = new Set(_.map(ranges, 'indexPattern'));
      return savedDashboards.find().then(function (dashboards) {
        const promises = _.map(dashboards.hits, (dashboard) => {
          savedSearches.get(dashboard.savedSearchId).then((savedSearch) => {
            if (savedSearch.kibanaSavedObjectMeta && savedSearch.kibanaSavedObjectMeta.searchSourceJSON) {
              const index = JSON.parse(savedSearch.kibanaSavedObjectMeta.searchSourceJSON).index;
              if (indexPatterns.has(index)) {
                return dashboard;
              }
            }
          });
        });
        return Promise.all(promises).then((dashboards) => {
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
    return this._executeSchemaAndClearCache({
      path: '/schema/relations',
      method: 'POST',
      data: relations
    });
  };

  /*
   * Inserts an entity into the relational model.
   */
  OntologyClient.prototype.insertEntity = function (entity) {
    if (!entity.id) {
      return Promise.reject('Missing entity id');
    } else {
      const encodedId = this._encodeUrl(entity.id);
      return this._executeSchemaAndClearCache({
        path: '/schema/entity/' + encodedId,
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
      return this._executeSchemaAndClearCache({
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
    const encodedId = this._encodeUrl(entity.id);
    return this._executeSchemaAndClearCache({
      path: '/schema/entity/' + encodedId,
      method: 'PUT',
      data: entity
    });
  };

  /*
   * Delete an entity by id.
   */
  OntologyClient.prototype.deleteEntity = function (entityId) {
    return this._executeSchemaAndClearCache({
      path: '/schema/entity/' + this._encodeUrl(entityId),
      method: 'DELETE'
    });
  };

  /*
   * Delete all relations having the passed entity as domain or range.
   */
  OntologyClient.prototype.deleteByDomainOrRange = function (entityId) {
    return this._executeSchemaAndClearCache({
      path: '/schema/relationByDomainOrRange/' + this._encodeUrl(entityId),
      method: 'DELETE'
    });
  };

  OntologyClient.prototype._executeSchemaAndClearCache = function (options) {
    const params = {
      path: options.path,
      method: options.method
    };
    if (options.entity) {
      params.entity = options.enity;
    }

    return queryEngineClient.schema(params)
    .then(() => {
      this.clearCache();
    });
  };

  OntologyClient.prototype.clearCache = function () {
    this._cachedEntitiesList = null;
    this._cachedEntitiesMap = {};
    this._cachedRelationsList = null;
    this._cachedEntityRanges = {};
  };

  return new OntologyClient();
});
