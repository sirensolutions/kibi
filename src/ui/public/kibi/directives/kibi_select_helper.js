define(function (require) {

  var chrome = require('ui/chrome');

  return function KibiSelectHelperFactory(
    config, $http, courier, indexPatterns, timefilter, Private, Promise, kibiState,
    savedSearches, savedTemplates, savedDashboards, savedQueries, savedDatasources, kbnIndex
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

      return $http.get(chrome.getBasePath() + '/elasticsearch/' + indexPath(indexPatternId) + '/_mappings')
      .then(function (response) {
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

    KibiSelectHelper.prototype.getJoinRelations = function () {
      var relations = config.get('kibi:relations');

      if (!!relations && !!relations.relationsIndices) {
        var labels = _.map(relations.relationsIndices, function (relInd) {
          return {
            label: relInd.label,
            value: relInd.id
          };
        });
        return Promise.resolve(labels);
      }
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

        const filteredMetas = _.filter(metas, (meta) => {
          return meta.savedDash.savedSearchId;
        });

        if (!otherDashboardId) {
          // just return all dashboards which have savedsearchId
          return _.map(filteredMetas, function (hit) {
            return {
              label: hit.savedDash.title,
              value: hit.savedDash.id
            };
          });
        }
        // find the meta of the otherDashboardId
        const otherDashboardMeta = _.find(filteredMetas, (meta) => {
          return meta.savedDash.id === otherDashboardId;
        });
        const otherIndexPattern = otherDashboardMeta.savedSearchMeta.index;

        const indexRelations = config.get('kibi:relations').relationsIndices;
        if (indexRelationId) {
          _.remove(indexRelations, (rel) => {
            return rel.id !== indexRelationId;
          });
        }

        let dashboardsToReturn = [];
        _.each(filteredMetas, (meta) => {
          let indexPattern = meta.savedSearchMeta.index;
          let dashboardId = meta.savedDash.id;
          // here check if there is an indexRelation between otherIndexPattern and indexPattern
          if (relationsHelper.indexRelationExists(indexRelations, indexPattern, otherIndexPattern) &&
              !_.find(dashboardsToReturn, 'id', dashboardId)
          ) {
            dashboardsToReturn.push({
              label: dashboardId,
              value: dashboardId
            });
          }
        });
        return dashboardsToReturn;
      });
    };

    KibiSelectHelper.prototype.getRelationsForButton = function (options = {}) {
      // expect sourceDashboardId and/or targetDashboardId in options
      var relations = config.get('kibi:relations');
      var ids;
      if (options.sourceDashboardId && options.targetDashboardId && options.sourceDashboardId === options.targetDashboardId) {
        ids = [options.sourceDashboardId];
      } else if (options.sourceDashboardId && options.targetDashboardId) {
        ids = [options.sourceDashboardId, options.targetDashboardId];
      } else if (options.sourceDashboardId) {
        ids = [options.sourceDashboardId];
      } else if (options.targetDashboardId) {
        ids = [options.targetDashboardId];
      } else {
        return Promise.resolve([]);
      }

      return kibiState._getDashboardAndSavedSearchMetas(ids)
      .then((savedSearchesAndMetas) => {
        var sourceDasboardMeta;
        var sourceDasboard;
        var sourceDasboardId;
        var sourceDasboardIndex;
        var targetDasboardMeta;
        var targetDasboard;
        var targetDasboaId;
        var targetDasboardIndex;

        if (options.sourceDashboardId && options.targetDashboardId && options.sourceDashboardId === options.targetDashboardId) {
          sourceDasboardMeta = savedSearchesAndMetas[0].savedSearchMeta;
          sourceDasboard = savedSearchesAndMetas[0].savedDash;
          sourceDasboardId  = sourceDasboard.id;
          sourceDasboardIndex  = sourceDasboardMeta.index;
          targetDasboardMeta = savedSearchesAndMetas[0].savedSearchMeta;
          targetDasboard = savedSearchesAndMetas[0].savedDash;
          targetDasboaId = targetDasboard.id;
          targetDasboardIndex  = targetDasboardMeta.index;
        } else if (options.sourceDashboardId && options.targetDashboardId) {
          sourceDasboardMeta = savedSearchesAndMetas[0].savedSearchMeta;
          sourceDasboard = savedSearchesAndMetas[0].savedDash;
          sourceDasboardId  = sourceDasboard.id;
          sourceDasboardIndex  = sourceDasboardMeta.index;
          targetDasboardMeta = savedSearchesAndMetas[1].savedSearchMeta;
          targetDasboard = savedSearchesAndMetas[1].savedDash;
          targetDasboaId = targetDasboard.id;
          targetDasboardIndex  = targetDasboardMeta.index;
        } else if (options.sourceDashboardId) {
          sourceDasboardMeta = savedSearchesAndMetas[0].savedSearchMeta;
          sourceDasboard = savedSearchesAndMetas[0].savedDash;
          sourceDasboardId  = sourceDasboard.id;
          sourceDasboardIndex  = sourceDasboardMeta.index;
        } else if (options.targetDashboardId) {
          targetDasboardMeta = savedSearchesAndMetas[0].savedSearchMeta;
          targetDasboard = savedSearchesAndMetas[0].savedDash;
          targetDasboaId = targetDasboard.id;
          targetDasboardIndex  = targetDasboardMeta.index;
        }
        // now filter the relations
        var filteredRelations = _(relations.relationsIndices)
        .filter((rel) => {
          var itemRelationDetails = relationsHelper.getRelationInfosFromRelationID(rel.id);

          if (sourceDasboardIndex && targetDasboardIndex) {
            if (
              (
                itemRelationDetails.source.index === sourceDasboardIndex &&
                itemRelationDetails.target.index === targetDasboardIndex
              )
              ||
              (
                itemRelationDetails.source.index === targetDasboardIndex &&
                itemRelationDetails.target.index === sourceDasboardIndex
              )
            ) {
              return true;
            }
            // only source dashboard selected by the user
          } else if (sourceDasboardIndex) {
            if (itemRelationDetails.source.index === sourceDasboardIndex ||
                itemRelationDetails.target.index === sourceDasboardIndex
            ) {
              return true;
            }
            // only target dashboard selected by the user
          } else if (targetDasboardIndex) {
            if (itemRelationDetails.source.index === targetDasboardIndex ||
                itemRelationDetails.target.index === targetDasboardIndex
            ) {
              return true;
            }
          }
          return false;
        })
        .sortBy((rel) => rel.label)
        .value();

        // before returning lets check for relations with the same name
        // in such case compose a more detailed labels for them so they can be distinguished by the user
        if (filteredRelations.length > 1) {
          for (var i = 1; i < filteredRelations.length; i++) {
            var prevRel = filteredRelations[i - 1];
            var rel = filteredRelations[i];
            if (prevRel.label === rel.label) {
              prevRel.label = relationsHelper.createMoreDetailedLabel(prevRel.id, targetDasboardIndex);
              rel.label = relationsHelper.createMoreDetailedLabel(rel.id, targetDasboardIndex);
            }
          }
        }

        var items = _.map(filteredRelations, (rel) => {
          return {
            label: rel.label,
            value: rel.id
          };
        });

        return Promise.resolve(items);
      });
    };

    return new KibiSelectHelper();
  };
});
