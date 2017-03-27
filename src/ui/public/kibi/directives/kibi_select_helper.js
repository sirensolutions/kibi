define(function (require) {

  var chrome = require('ui/chrome');

  return function KibiSelectHelperFactory(
    config, $http, courier, indexPatterns, timefilter, Private, Promise, kibiState,
    savedSearches, savedTemplates, savedDashboards, savedQueries, savedDatasources,
    mappings
    ) {

    function KibiSelectHelper() {
    }

    var _ = require('lodash');
    var sparqlHelper = Private(require('ui/kibi/helpers/sparql_helper'));
    var sqlHelper = Private(require('ui/kibi/helpers/sql_helper'));
    var indexPath = Private(require('ui/kibi/components/commons/_index_path'));
    var datasourceHelper = Private(require('ui/kibi/helpers/datasource_helper'));
    var relationsHelper = Private(require('ui/kibi/helpers/relations_helper'));
    var kibiUtils = require('kibiutils');

    KibiSelectHelper.prototype.getQueries = function () {
      return Promise.all([ savedQueries.find(), savedDatasources.find() ]).then(function (results) {
        var queries = results[0].hits;
        var datasources = results[1].hits;
        var items = [];
        for (var i = 0; i < queries.length; i++) {
          var queryDatasource = queries[i].datasourceId;
          var datasource = getDatasource(datasources, queryDatasource);
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
          var items = _.map(data.hits, function (hit) {
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
          var items = _.map(data.hits, function (hit) {
            return {
              label: hit.title,
              value: hit.id
            };
          });
          return items;
        }
      });
    };

    KibiSelectHelper.prototype.getDashboards = function (dashboardOptions) {
      return savedDashboards.find().then(function (data) {
        if (data.hits) {
          return _.map(data.hits, function (hit) {
            return {
              label: hit.title,
              value: hit.id
            };
          });
        }
      });
    };

    KibiSelectHelper.prototype.getDatasources = function () {
      return savedDatasources.find().then(function (data) {
        if (data.hits) {
          var items = _.map(data.hits, function (hit) {
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

      return $http.get(
        chrome.getBasePath() + '/elasticsearch/' + indexPath(indexPatternId) + '/' + indexPatternType + '/_search?size=10'
      ).then(function (response) {
        var ids = [];
        _.each(response.data.hits.hits, function (hit) {
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
      return mappings.getMapping(indexPatternId).then((response) => {
        var types = [];
        for (var indexId in response.data) {
          if (response.data[indexId].mappings) {
            for (var type in response.data[indexId].mappings) {
              if (response.data[indexId].mappings.hasOwnProperty(type) && types.indexOf(type) === -1) {
                types.push(type);
              }
            }
          }
        }
        return _.map(types, function (type) {
          return {
            label: type,
            value: type
          };
        });
      });
    };

    KibiSelectHelper.prototype.getFields = function (indexPatternId, fieldTypes, scriptedFields) {
      var defId;
      if (indexPatternId) {
        defId = indexPatternId;
      } else {
        defId = config.get('defaultIndex');
      }

      return indexPatterns.get(defId).then(function (index) {
        var fields = _.chain(index.fields)
        .filter(function (field) {
          // filter some fields
          if (fieldTypes instanceof Array && fieldTypes.length > 0) {
            return fieldTypes.indexOf(field.type) !== -1 && field.name && field.name.indexOf('_') !== 0;
          } else {
            return field.type !== 'boolean' && field.name && field.name.indexOf('_') !== 0 &&
             ((scriptedFields === 'false' || scriptedFields === undefined) ?
             !field.scripted : scriptedFields);
          }
        }).sortBy(function (field) {
          return field.name;
        }).map(function (field) {
          return {
            label: field.name,
            value: field.name,
            scripted: field.scripted,
            options: {
              analyzed: field.analyzed,
              scripted: field.scripted
            }
          };
        }).value();
        return fields;
      });
    };

    KibiSelectHelper.prototype.getIndexesId = function () {
      return courier.indexPatterns.getIds().then(function (ids) {
        var fields = _.map(ids, function (id) {
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
          var resultQuery = savedQuery.resultQuery;
          var variables = [];

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
            } else if (kibiUtils.DatasourceTypes.tinkerpop3 !== datasourceType) {
              return Promise.reject(new Error('Unknown datasource type for query=' + queryId + ': ' + datasourceType));
            }
          } catch (err) {
            return Promise.reject(new Error(`Failed to extract the variables from the query=${queryId}: ${err.message}`));
          }

          var fields = _.map(variables, function (v) {
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
      var types = [
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
      var types = [
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

      return kibiState._getDashboardAndSavedSearchMetas(null, true).then((metas) => {
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
          let otherIndexPattern = otherDashboardMeta.savedSearchMeta.index;

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
});
