import _ from 'lodash';
import { SparqlHelperFactory } from 'ui/kibi/helpers/sparql_helper';
import { SQLHelperFactory } from 'ui/kibi/helpers/sql_helper';
import { IndexPathProvider } from 'ui/kibi/components/commons/_index_path';
import { DatasourceHelperFactory } from 'ui/kibi/helpers/datasource_helper';
import { RelationsHelperFactory } from 'ui/kibi/helpers/relations_helper';
import kibiUtils from 'kibiutils';

export function KibiSelectHelperFactory(config, indexPatterns, Private, Promise, kibiState, es, savedSearches, savedTemplates,
  savedDashboards, savedQueries, savedDatasources, mappings) {

  function KibiSelectHelper() {
  }

  const sparqlHelper = Private(SparqlHelperFactory);
  const sqlHelper = Private(SQLHelperFactory);
  const indexPath = Private(IndexPathProvider);
  const datasourceHelper = Private(DatasourceHelperFactory);
  const relationsHelper = Private(RelationsHelperFactory);

  KibiSelectHelper.prototype.getQueries = function () {
    return Promise.all([ savedQueries.find(), savedDatasources.find() ]).then(function (results) {
      const queries = results[0].hits;
      const datasources = results[1].hits;
      const items = [];
      for (let i = 0; i < queries.length; i++) {
        const queryDatasource = queries[i].datasourceId;
        const datasource = getDatasource(datasources, queryDatasource);
        items.push({
          group: queries[i].tags.length ? queries[i].tags.join() : 'No tag',
          datasourceType: datasource.length > 0 ? datasource[0].datasourceType : null,
          label: queries[i].title,
          value: queries[i].id
        });
      }
      return items;
    });

    function getDatasource(datasources, reference) {
      return _.filter(datasources, function (o) {
        return o.id === reference;
      });
    }
  };

  KibiSelectHelper.prototype.getSavedSearches = function () {
    return savedSearches.find().then(function (data) {
      if (data.hits) {
        const items = _.map(data.hits, function (hit) {
          return {
            label: hit.title,
            value: hit.id
          };
        });
        return items;
      }
    });
  };

  KibiSelectHelper.prototype.getTemplates = function () {
    return savedTemplates.find().then(function (data) {
      if (data.hits) {
        const items = _.map(data.hits, function (hit) {
          return {
            label: hit.title,
            value: hit.id,
            templateEngine: hit.templateEngine
          };
        });
        return items;
      }
    });
  };

  KibiSelectHelper.prototype.getDatasources = function () {
    return savedDatasources.find().then(function (data) {
      if (data.hits) {
        const items = _.map(data.hits, function (hit) {
          return {
            label: hit.title,
            value: hit.id,
            type: hit.datasourceType
          };
        });
        return items;
      }
    });
  };


  KibiSelectHelper.prototype.getDocumentIds = function (indexPatternId, indexPatternType) {
    if (!indexPatternId || !indexPatternType || indexPatternId === '' || indexPatternType === '') {
      return Promise.resolve([]);
    }

    return es.search({
      index: indexPath(indexPatternId),
      type: indexPatternType,
      _source: false,
      size: 10
    }).then(function (response) {
      const ids = [];
      _.each(response.hits.hits, function (hit) {
        ids.push({
          label: hit._id,
          value: hit._id
        });
      });

      return ids;
    });
  };


  KibiSelectHelper.prototype.getIndexTypes = function (indexPatternId) {
    if (!indexPatternId) {
      return Promise.resolve([]);
    }

    return mappings.getMapping(indexPatternId)
    .then((response) => {
      const types = new Set();

      _.each(response, (mapping, indexName) => {
        for (const type of Object.keys(mapping.mappings)) {
          types.add(type);
        }
      });

      const typesElements = [];
      types.forEach(type => {
        typesElements.push({
          label: type,
          value: type
        });
      });
      return typesElements;
    });
  };

  KibiSelectHelper.prototype.getFields = function (indexPatternId, fieldTypes, scriptedFields = false) {
    const metaFields = config.get('metaFields');
    let defId;

    if (indexPatternId) {
      defId = indexPatternId;
    } else {
      defId = config.get('defaultIndex');
    }

    return indexPatterns.get(defId).then(function (index) {
      return _.chain(index.fields)
      .filter(function (field) {
        if (!field.name || _.contains(metaFields, field.name)) {
          return false;
        }

        // filter some fields
        if (Array.isArray(fieldTypes) && fieldTypes.length > 0) {
          return _.contains(fieldTypes, field.type) && (!scriptedFields ? !field.scripted : scriptedFields);
        } else {
          return field.type !== 'boolean' && (!scriptedFields ? !field.scripted : scriptedFields);
        }
      })
      .sortBy('name')
      .map(function (field) {
        return {
          label: field.name,
          value: field.name,
          scripted: field.scripted,
          options: {
            analyzed: field.type === 'text',
            scripted: field.scripted
          }
        };
      })
      .value();
    });
  };

  KibiSelectHelper.prototype.getIndexesId = function () {
    return indexPatterns.getIds().then(function (ids) {
      const fields = _.map(ids, function (id) {
        return {
          label: id,
          value: id
        };
      });
      return fields;
    });
  };

  KibiSelectHelper.prototype.getQueryVariables = function (queryId) {
    if (!queryId) {
      return Promise.reject(new Error('Unable to get variables of unknown query'));
    }
    // first fetch the query
    return savedQueries.find().then(function (queries) {
      const savedQuery = _.find(queries.hits, 'id', queryId);
      if (!savedQuery) {
        return Promise.reject(new Error('Query with id [' + queryId + '] was not found'));
      }
      if (!savedQuery.datasourceId) {
        return Promise.reject(new Error('SavedQuery [' + queryId + '] does not have datasourceId parameter'));
      }
      return datasourceHelper.getDatasourceType(savedQuery.datasourceId).then(function (datasourceType) {
        const resultQuery = savedQuery.resultQuery;
        let variables = [];

        try {
          if (kibiUtils.isSPARQL(datasourceType)) {
            variables = sparqlHelper.getVariables(resultQuery);
          } else if (kibiUtils.isSQL(datasourceType)) {
            variables = sqlHelper.getVariables(resultQuery);
          } else if (kibiUtils.DatasourceTypes.rest === datasourceType) {
            if (savedQuery.rest_variables) {
              variables = _.map(JSON.parse(savedQuery.rest_variables), (v) => v.name);
            } else {
              variables = [];
            }
          } else {
            return Promise.reject(new Error('Unknown datasource type for query=' + queryId + ': ' + datasourceType));
          }
        } catch (err) {
          return Promise.reject(new Error(`Failed to extract the variables from the query=${queryId}: ${err.message}`));
        }

        const fields = _.map(variables, function (v) {
          const value = v.replace('?', '').replace(',', ''); // in case of sparql we have to remove the '?';
          return {
            label: v.replace(',', ''),
            value: value
          };
        });
        return {
          fields: fields,
          datasourceType: datasourceType
        };
      });
    });
  };

  KibiSelectHelper.prototype.getIconType = function () {
    const types = [
      {
        label:'Font Awesome',
        value: 'fontawesome'
      },
      {
        label:'Parameterized Relative Path',
        value: 'relpath'
      }
    ];

    return Promise.resolve(types);
  };

  KibiSelectHelper.prototype.getLabelType = function () {
    const types = [
      {
        label:'Document Field',
        value: 'docField'
      },
      {
        label:'Parameterized Field',
        value: 'paramField'
      }
    ];

    return Promise.resolve(types);
  };

  KibiSelectHelper.prototype.getDashboardsForButton = function (dashboardOptions) {
    const otherDashboardId = dashboardOptions.otherDashboardId;
    const indexRelationId = dashboardOptions.indexRelationId;

    return kibiState._getDashboardAndSavedSearchMetas(null, false)
    .then((metas) => {
      // first filter out dashboards without savedSearchId
      let filteredMetas = _.filter(metas, (meta) => {
        return meta.savedDash.savedSearchId;
      });

      // if no indexPattern just return all dashboards with savedSearchId
      if (!indexRelationId) {
        // just return all dashboards
        return _.map(filteredMetas, function (hit) {
          return {
            label: hit.savedDash.title,
            value: hit.savedDash.id
          };
        });
      }

      const indexRelation = _.find(config.get('kibi:relations').relationsIndices, (rel) => {
        return rel.id === indexRelationId;
      });

      if (!indexRelation) {
        return [];
      }

      // in case the otherDashboardId was present, find it
      if (otherDashboardId) {
        // find the meta and indexPatternId of the other dashboard
        const otherDashboardMeta = _.find(filteredMetas, (meta) => {
          return meta.savedDash.id === otherDashboardId;
        });
        const otherIndexPattern = otherDashboardMeta.savedSearchMeta.index;

        // and filter out dashboard matched by index pattern
        // but only if it is not self join relation
        if (indexRelation.indices[0].indexPatternId !== indexRelation.indices[1].indexPatternId) {
          filteredMetas = _.filter(filteredMetas, (meta) => {
            return meta.savedSearchMeta.index !== otherIndexPattern;
          });
        }
      }

      return _(filteredMetas)
      .filter(meta => {
        // check if indexPattern belongs to either side of the indexRelation
        const indexPattern = meta.savedSearchMeta.index;
        return indexPattern === indexRelation.indices[0].indexPatternId || indexPattern === indexRelation.indices[1].indexPatternId;
      })
      .unique(meta => meta.savedDash.id)
      .map(meta => {
        return {
          label: meta.savedDash.title,
          value: meta.savedDash.id
        };
      })
      .value();
    });
  };

  return new KibiSelectHelper();
};
