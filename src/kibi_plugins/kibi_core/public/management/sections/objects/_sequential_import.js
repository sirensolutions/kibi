import GetIdsProvider from 'ui/index_patterns/_get_ids';
import _ from 'lodash';

export default function loadObjectsFactory(kbnIndex, Private, esAdmin, Promise, config, kbnVersion) {
  const getIds = Private(GetIdsProvider);

  // override config properties
  const loadConfig = function (configDocument) {
    if (configDocument) {
      if (configDocument._id === kbnVersion) {
        // override existing config values
        return Promise.all(_.map(configDocument._source, (value, key) => config.set(key, value)));
      } else {
        return Promise.reject(
          'Config object version [' + configDocument._id + '] in the import ' +
          'does not match current version [' + kbnVersion + ']\n' +
          'Will NOT import any of the advanced settings parameters'
        );
      }
    } else {
      // return Promise so we can chain the other part
      return Promise.resolve(true);
    }
  };

  // load index-patterns
  const createIndexPattern = function (doc) {
    return esAdmin.index({
      index: kbnIndex,
      type: 'index-pattern',
      id: doc._id,
      body: doc._source
    });
  };

  const loadIndexPatterns = function (indexPatternDocuments) {
    if (indexPatternDocuments && indexPatternDocuments.length > 0) {
      const promises = _.map(indexPatternDocuments, doc => createIndexPattern(doc));
      return Promise.all(promises).then(() => {
        // very important !!! to clear the cached promise
        // which returns list of index patterns
        getIds.clearCache();
      });
    } else {
      return Promise.resolve(true);
    }
  };

  // now execute this sequentially
  const executeSequentially = function (services, docs, notify) {
    const functionArray = _.map(docs, function (doc) {
      return function (previousOperationResult) {
        const { service } = _.find(services, { type: doc._type }) || {};

        if (!service) {
          const msg = `Skipped import of "${doc._source.title}" (${doc._id})`;
          const reason = `Invalid type: "${doc._type}"`;

          notify.warning(`${msg}, ${reason}`, {
            lifetime: 0,
          });

          return;
        }

        return service.get().then(function (obj) {
          obj.id = doc._id;
          return obj.applyESResp(doc).then(function () {
            return obj.save({ confirmOverwrite : true });
          });
          obj.id = doc._id;
          return obj.applyESResp(doc).then(function () {
            return obj.save({ confirmOverwrite: true });
          });
        });
      };
    });

    return functionArray.reduce(
      function (prev, curr, i) {
        return prev.then(function (res) {
          return curr(res);
        });
      },
      Promise.resolve(null)
    );
  };

  return function loadObjects(services, docs, configDocument, notify) {
    // added to manage index-patterns import
    const indexPatternDocuments = _.filter(docs, function (o) {
      return o._type === 'index-pattern';
    });

    docs = _.filter(docs, function (doc) {
      return doc._type !== 'config' && doc._type !== 'index-pattern';
    });

    // added to sort the docs by type
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

    return loadIndexPatterns(indexPatternDocuments)
    .then(function () {
      return loadConfig(configDocument);
    })
    .then(function () {
      return executeSequentially(services, docs, notify);
    });
  };
};
