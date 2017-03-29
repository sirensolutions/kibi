import uiModules from 'ui/modules';

uiModules
.get('kibana')
.factory('mappings', (es) => {

  class Mappings {
    constructor() {
      this.promisesCache = {};
    }

    getMapping(indexPatternId) {
      if (this.promisesCache[indexPatternId]) {
        return this.promisesCache[indexPatternId];
      }
      const promise = es.indices.getMapping({
        index: indexPatternId,
        ignoreUnavailable: true,
        allowNoIndices: true
      });
      this.promisesCache[indexPatternId] = promise;
      return promise;
    }

    clearCache() {
      this.promisesCache = {};
    }
  }

  return new Mappings();
});
