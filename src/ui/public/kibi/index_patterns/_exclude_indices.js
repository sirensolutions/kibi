import { each, filter } from 'lodash';

export function IndexPatternsExcludeIndicesProvider(config, createNotifier) {

  const notify = createNotifier({ location: 'Exclude indices' });

  const matched = function (exclusionRegexesList, indexName) {
    let matched = false;
    for (let i = 0; i < exclusionRegexesList.length; i++) {
      const excludePattern = exclusionRegexesList[i];
      try {
        const regex = new RegExp(excludePattern);
        if (regex.test(indexName)) {
          matched = true;
          break;
        }
      } catch (e) {
        // ignore invalid regexes but show warnings
        notify.warning(
          'The following exclude regex pattern is invalid [ ' + excludePattern + '].' +
          ' Correct it in Management -> Advanced Settings -> siren:indexExclusionRegexList'
        );
      }
    }

    return matched;
  };

  /*
   * Where indices is either a:
   * a map with keys beeing indices names
   * an array where each object has an index key
   */
  function excludeIndices(indices) {
    const exclusionRegexesList = config.get('siren:indexExclusionRegexList');
    if (indices instanceof Array) {
      const indicesArray = indices;
      const filteredArray = filter(indicesArray, indexObject => {
        return matched(exclusionRegexesList, indexObject.index) === false;
      });
      return filteredArray;
    } else {
      const indicesMap = indices;
      const filteredMap = {};
      for (const indexName in indicesMap) {
        if (indicesMap.hasOwnProperty(indexName) && matched(exclusionRegexesList, indexName) === false) {
          filteredMap[indexName] = indicesMap[indexName];
        }
      }
      return filteredMap;
    }
  }

  return {
    excludeIndices
  };
};
