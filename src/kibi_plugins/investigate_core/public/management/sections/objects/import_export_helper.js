import { IndexPatternsGetProvider }  from 'ui/index_patterns/_get';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';
import { SavedObjectsClientProvider } from 'ui/saved_objects';
import _ from 'lodash';

export default function ImportHelperFactory(config, es, kibiVersion, kbnIndex,
  queryEngineClient, Private, Promise, indexPatterns, dashboardGroups) {

  const getIds = Private(IndexPatternsGetProvider);
  const visTypes = Private(VisTypesRegistryProvider);
  const savedObjectsClient = Private(SavedObjectsClientProvider);

  class ImportExportHelper {

    createIndexPattern(doc) {
      return savedObjectsClient.create('index-pattern', doc._source, { id: doc._id });
    }

    loadIndexPatterns(indexPatternDocuments, notify) {
      if (indexPatternDocuments && indexPatternDocuments.length > 0) {
        const promises = [];
        _.each(indexPatternDocuments, (doc) => {
          // lets try to fetch the field mappings to check
          // that index-pattern matches any existing indices
          const promise = es.indices.getFieldMapping({
            index: doc._id,
            fields: '*',
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
        return Promise.all(promises);
      } else {
        return Promise.resolve(true);
      }
    }

    loadConfig(configDocument, notify) {
      if (configDocument) {
        // kibi: siren uses 'siren' config
        if (configDocument._id === 'siren') {
          // override existing config values
          const promises = [];
          _.each(configDocument._source, function (value, key) {
            promises.push(config.set(key, value));
          });
          return Promise.all(promises);
        } else {
          notify.error(
            'Config object version [' + configDocument._id + '] in the import ' +
            'does not match current version [ siren ]\n' +
            'Non of the advanced settings parameters were imported'
          );
          return Promise.resolve(true);
        }
      } else {
        // return Promise so we can chain the other part
        return Promise.resolve(true);
      }
    }

    reloadQueries() {
      return queryEngineClient.clearCache();
    }

    checkVisualizationTypeExists(doc, notify) {
      // extra check to make sure that required visualisation plugin is present
      try {
        const visState = JSON.parse(doc._source.visState);
        if (!visTypes.byName[visState.type]) {
          notify.error(
            'Unknown visualisation type [' + visState.type + '] for [' + doc._id + ']. ' +
            'Make sure that all required plugins are installed'
          );
          return false;
        } else {
          return true;
        }
      } catch (err) {
        notify.error('Unknown error while parsing visState of [' + doc._id + '] visualisation.');
      }
    }

    /*
     * Remove defaults scripts from the list of import objects
     */
    removeDefaultScripts(docs, notify) {
      const sampleScriptsId = [
        'Signal-Dead-Companies',
        'Select-By-Edge-Count',
        'Select-By-Type',
        'Add-time-fields.-(works-only-with-Kibi-Demo-data)',
        'Replace-Investment-with-edge.-(works-only-with-Kibi-Demo-data)',
        'Select-All',
        'Shortest-Path',
        'Replace-Investment-with-edge-(onUpdate).-(works-only-with-Kibi-Demo-data)',
        'Expand-by-relation',
        'Select-Invert',
        'Select-Extend',
        'Expand-by-top-comention',
        'Default-Expansion-Policy',
        'Add-geo-locations-for-map-visualization.-(works-only-with-Kibi-Demo-data)',
        'Show-nodes-count-by-type'
      ];

      const defaultScriptsInDocs = [];
      docs = _.filter(docs, function (doc) {
        if(doc._type === 'script') {
          if(_.includes(sampleScriptsId, doc._id)) {
            defaultScriptsInDocs.push(doc._source.title);
            return false;
          } else {
            return true;
          }
        } else {
          return true;
        }
      });

      if(defaultScriptsInDocs.length > 0) {
        notify.warning(
          'These scripts [' + defaultScriptsInDocs + '] are immutable scripts and cannot be modified'
        );
      }
      return docs;
    }

    /*
     * Add config and index patterns to the list of exported objects
     */
    addExtraObjectForExportAll(objectsToExport) {
      // kibi: '_' is added to id and type
      objectsToExport.push([{ _id: 'siren', _type: 'config' }]);

      return indexPatterns.getIds().then(function (list) {
        _.each(list, (id) => {
          // kibi: '_' is added to id and type
          objectsToExport.push([{ _id: id, _type: 'index-pattern' }]);
        });
        return objectsToExport;
      });
    }

    moveConfigToTop(docs) {
      docs.sort(function (a, b) {
        if (a._type === 'config' && b._type !== 'config') {
          return -1;
        } else if (a._type !== 'config' && b._type === 'config') {
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
    }

    importIndexPatternsConfigSortDocuments(docs, notify) {
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

      const self = this;
      docs = _.filter(docs, function (doc) {
        if (doc._type === 'visualization') {
          return self.checkVisualizationTypeExists(doc, notify);
        } else {
          return doc._type !== 'config' && doc._type !== 'index-pattern';
        }
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

      return this.loadIndexPatterns(indexPatternDocuments, notify).then(() => {
        return this.loadConfig(configDocument, notify).then(() => {
          return docs;
        });
      });
    }
  }

  return new ImportExportHelper();
};
