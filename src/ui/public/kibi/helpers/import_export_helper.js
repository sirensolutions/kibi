import _ from 'lodash';

export default function ImportHelper(config, es, savedObjectsAPI, kibiVersion, kbnIndex,
  queryEngineClient, createNotifier, Private, Promise, indexPatterns) {

  const getIds = Private(require('ui/index_patterns/_get_ids'));
  const notify = createNotifier({ location: 'Import Helper' });
  const visTypes = Private(require('ui/registry/vis_types'));

  class ImportExportHelper {

    createIndexPattern(doc) {
      return savedObjectsAPI.index({
        index: kbnIndex,
        type: 'index-pattern',
        id: doc._id,
        body: doc._source
      });
    }

    loadIndexPatterns(indexPatternDocuments) {
      if (indexPatternDocuments && indexPatternDocuments.length > 0) {
        const promises = [];
        _.each(indexPatternDocuments, (doc) => {
          // lets try to fetch the field mappings to check
          // that index-pattern matches any existing indices
          const promise = es.indices.getFieldMapping({
            index: doc._id,
            field: '*',
            allowNoIndices: false,
            includeDefaults: true
          }).catch((err) => {
            notify.warning(
              'Imported index-pattern: [' + doc._id + '] did not match any indices. ' +
              'If you would like to remove it go to Settings->Indices'
            );
          }).finally(() => {
            return this.createIndexPattern(doc);
          });
          promises.push(promise);
        });
        return Promise.all(promises).then(() => {
          // very important !!! to clear the cached promise
          // which returns list of index patterns
          getIds.clearCache();
        });
      } else {
        return Promise.resolve(true);
      }
    }

    loadConfig(configDocument) {
      if (configDocument) {
        if (configDocument._id === kibiVersion) {
          // override existing config values
          const promises = [];
          _.each(configDocument._source, function (value, key) {
            promises.push(config.set(key, value));
          });
          return Promise.all(promises);
        } else {
          notify.error(
            'Config object version [' + configDocument._id + '] in the import ' +
            'does not match current version [' + kibiVersion + ']\n' +
            'Will NOT import any of the advanced settings parameters'
          );
        }
      } else {
        // return Promise so we can chain the other part
        return Promise.resolve(true);
      }
    }

    executeSequentially(docs, services) {
      const functionArray = [];
      _.each(docs, function (doc) {
        functionArray.push(function (previousOperationResult) {
          // previously this part was done in Promise.map
          const { service } = _.find(services, { type: doc._type }) || {};

          if (!service) {
            const msg = `Skipped import of "${doc._source.title}" (${doc._id})`;
            const reason = `Invalid type: "${doc._type}"`;

            notify.warning(`${msg}, ${reason}`, {
              lifetime: 0,
            });

            return Promise.resolve({});
          }

          // extra check to make sure that required visualisation plugin is present
          if (doc._type === 'visualization') {
            try {
              const visState = JSON.parse(doc._source.visState);
              if (!visTypes.byName[visState.type]) {
                notify.error(
                  'Unknown visualisation type [' + visState.type + '] for [' + doc._id + ']. ' +
                  'Make sure that all require plugins are installed'
                );
                return Promise.resolve({});
              }
            } catch (err) {
              notify.error('Unknown error while parsing visState of [' + doc._id + '] visualisation.');
            }
          }

          return service.get().then(function (obj) {
            obj.id = doc._id;
            return obj.applyESResp(doc).then(function () {
              return obj.save();
            });
          });
          // end
        });
      });

      return functionArray.reduce(
        function (prev, curr, i) {
          return prev.then(function (res) {
            return curr(res);
          });
        },
        Promise.resolve(null)
      );
    }

    reloadQueries() {
      return queryEngineClient.clearCache();
    }

    /*
     * Add config and index patterns to the list of exported objects
     */
    addExtraObjectForExportAll(objectsToExport) {
      objectsToExport.push([{id: kibiVersion, type: 'config'}]);

      return indexPatterns.getIds().then(function (list) {
        _.each(list, (id) => {
          objectsToExport.push([{id: id, type: 'index-pattern'}]);
        });
        return objectsToExport;
      });
    }

    importDocuments(docs, services) {
      // kibi: change the import to sequential to solve the dependency problem between objects
      // as visualisations could depend on searches
      // lets order the export to make sure that searches comes before visualisations
      // then also import object sequentially to avoid errors
      const configDocument = _.find(docs, function (o) {
        return o._type === 'config';
      });

      // kibi: added to manage index-patterns import
      const indexPatternDocuments = _.filter(docs, function (o) {
        return o._type === 'index-pattern';
      });

      docs = _.filter(docs, function (doc) {
        return doc._type !== 'config' && doc._type !== 'index-pattern';
      });

      // kibi: added to sort the docs by type
      docs.sort(function (a, b) {
        if (a._type === 'search' && b._type !== 'search') {
          return -1;
        } else if (a._type !== 'search' && b._type === 'search') {
          return 1;
        } else {
          if (a._type < b._type) {
            return -1;
          } else if (a._type > b._type) {
            return 1;
          } else {
            return 0;
          }
        }
      });

      return this.loadIndexPatterns(indexPatternDocuments).then(() => {
        return this.loadConfig(configDocument).then(() => {
          return this.executeSequentially(docs, services);
        });
      });
    }
  }

  return new ImportExportHelper();
};



