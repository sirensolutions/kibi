define(function (require) {
  return function StSelectHelperFactory(config, $http, courier, indexPatterns, timefilter,
                                        savedQueries, savedDashboards, savedDatasources, Private, Promise) {

    function StSelectHelper() {
    }

    var _ = require('lodash');
    var sparqlHelper = Private(require('components/sindicetech/sparql_helper/sparql_helper'));
    var sqlHelper = Private(require('components/sindicetech/sql_helper/sql_helper'));
    var datasourceHelper = Private(require('components/sindicetech/datasource_helper/datasource_helper'));
    var indexPath = Private(require('plugins/kibi/commons/_index_path'));

    var searchRequest = function (type) {
      return $http.get('elasticsearch/' + config.file.kibana_index + '/' + type + '/_search?size=100');
    };

    StSelectHelper.prototype.getQueries = function () {
      return searchRequest('query').then(function (queries) {
        if (queries.data.hits && queries.data.hits.hits) {
          var items = _.map(queries.data.hits.hits, function (hit) {
            return {
              group: hit._source.st_tags.length ? hit._source.st_tags.join() : 'No tag',
              label: hit._source.title,
              value: hit._id
            };
          });
          return items;
        }
      });
    };

    StSelectHelper.prototype.getDashboards = function () {
      return savedDashboards.find().then(function (data) {
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

    StSelectHelper.prototype.getObjects = function (type) {
      return searchRequest(type).then(function (objects) {
        if (objects.data.hits && objects.data.hits.hits) {
          var items = _.map(objects.data.hits.hits, function (hit) {
            return {
              label: hit._source.title,
              value: hit._id
            };
          });
          return items;
        }
      });
    };

    StSelectHelper.prototype.getDatasources = function () {
      return savedDatasources.find().then(function (data) {
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


    StSelectHelper.prototype.getDocumentIds = function (indexPatternId, indexPatternType) {
      if (!indexPatternId || !indexPatternType || indexPatternId === '' || indexPatternType === '') {
        return Promise.resolve([]);
      }

      return $http.get('elasticsearch/' + indexPath(indexPatternId) + '/' + indexPatternType + '/_search?size=10')
      .then(function (response) {
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


    StSelectHelper.prototype.getIndexTypes = function (indexPatternId) {
      if (!indexPatternId) {
        return Promise.resolve([]);
      }

      return $http.get('elasticsearch/' + indexPath(indexPatternId) + '/_mappings')
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

    StSelectHelper.prototype.getJoinRelations = function () {
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

    StSelectHelper.prototype.getFields = function (indexPatternId, fieldTypes) {
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
            return field.type !== 'boolean' && field.name && field.name.indexOf('_') !== 0;
          }
        }).sortBy(function (field) {
          return field.name;
        }).map(function (field) {
          return {
            label: field.name,
            value: field.name,
            options: {
              analyzed: field.analyzed
            }
          };
        }).value();
        return fields;
      });
    };

    StSelectHelper.prototype.getIndexesId = function () {
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

    StSelectHelper.prototype.getQueryVariables = function (queryId) {
      if (!queryId) {
        return Promise.reject(new Error('No queryId'));
      }
      // first fetch the query
      return new Promise(function (fulfill, reject) {
        savedQueries.get(queryId).then(function (savedQuery) {
          if (!savedQuery.st_datasourceId) {
            reject(new Error('SavedQuery [' + queryId + '] does not have st_datasourceId parameter'));
          }
          datasourceHelper.getDatasourceType(savedQuery.st_datasourceId).then(function (datasourceType) {
            var resultQuery = savedQuery.st_resultQuery;
            var variables = [];
            switch (datasourceType) {
              case 'sparql_http':
              case 'jdbc-sparql':
                variables = sparqlHelper.getVariables(resultQuery);
                break;
              case 'sqlite':
              case 'mysql':
              case 'pgsql':
              case 'jdbc':
                variables = sqlHelper.getVariables(resultQuery);
                break;
              case 'rest':
                // do nothing if variables is empty a text box instead of select should be rendered
                break;
              default:
                return reject('Unknown datasource type for query=' + queryId + ': ' + datasourceType);
            }

            var fields = _.map(variables, function (v) {
              return {
                label: v.replace(',', ''),
                value: v.replace('?', '').replace(',', '') // in case of sparql we have to remove the '?'
              };
            });
            fulfill({
              fields: fields,
              datasourceType: datasourceType
            });
          })
          .catch(function (err) {
            reject(err);
          });
        })
        .catch(function (err) {
          reject(err);
        });
      });
    };

    return new StSelectHelper();
  };
});
