import { IndexPatternAuthorizationError, NoDefaultIndexPattern } from 'ui/errors';
import { IndexPatternsGetProvider } from 'ui/index_patterns/_get';
import { uiModules } from 'ui/modules';
import { map } from 'lodash';

function KibiDefaultIndexPatternProvider(Private, indexPatterns) {

  const getIds = Private(IndexPatternsGetProvider)('id');

  const _loadIndexPattern = function (patterns, indexPattern, defaultId) {
    const indexPatternId = indexPattern || defaultId;

    return indexPatterns.get(indexPatternId)
    // Everything ok it will return the pattern else
    .catch(err => {
      if (err instanceof IndexPatternAuthorizationError) {
        if (patterns.length) {
          return _loadIndexPattern(patterns, patterns.pop());
        } else {
          // None of the known index patterns can be accessed
          throw new NoDefaultIndexPattern();
        }
      }
      throw err;
    });
  };

  class KibiDefaultIndexPattern {

    async getDefaultIndexPattern(patterns, indexPatternId, defaultId) {
      let promise;
      // use the patterns if passed
      if (patterns instanceof Array) {
        promise = Promise.resolve(patterns).then(patterns => {
          return map(patterns, p => p.id);
        });
      } else if (patterns === undefined) {
        promise = getIds();
      }


      return promise.then(function (patterns) {
        if (!indexPatternId && !defaultId && patterns.length > 0) {
          defaultId = patterns[0];
        }

        return _loadIndexPattern(patterns, indexPatternId, defaultId);
      });
    }

  }

  return new KibiDefaultIndexPattern();
}


uiModules
.get('kibana')
.service('kibiDefaultIndexPattern', (Private) => Private(KibiDefaultIndexPatternProvider));
