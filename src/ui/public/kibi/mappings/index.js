import chrome from 'ui/chrome';
import uiModules from 'ui/modules';

uiModules
.get('kibana')
.factory('mappings', (Private, $http) => {
  const indexPath = Private(require('ui/kibi/components/commons/_index_path'));

  class Mappings {
    constructor() {
      this.promisesCache = {};
    }

    getMapping(indexPatternId) {
      if (this.promisesCache[indexPatternId]) {
        return this.promisesCache[indexPatternId];
      }
      const promise = $http.get(chrome.getBasePath() + '/elasticsearch/' + indexPath(indexPatternId) + '/_mappings');
      this.promisesCache[indexPatternId] = promise;
      return promise;
    }

    clearCache() {
      this.promisesCache = {};
    }
  }

  return new Mappings();
});
