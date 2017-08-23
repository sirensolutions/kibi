import _ from 'lodash';
//TODO MERGE 5.5.2 add kibi comments
import { Notifier } from 'kibie/notify/notifier';
import { IndexPatternAuthorizationError, NoDefaultIndexPattern } from 'ui/errors';
import { IndexPatternsGetIdsProvider } from '../_get_ids';
import uiRoutes from 'ui/routes';

// kibi: imports
import RootSearchSourceProvider from 'ui/courier/data_source/_root_search_source';
// kibi: end

const notify = new Notifier({
  location: 'Index Patterns'
});

module.exports = function (opts) {
  opts = opts || {};
  const whenMissingRedirectTo = opts.whenMissingRedirectTo || null;
  let defaultRequiredToasts = null;

  //TODO MERGE 5.5.2 add kibi comment
  uiRoutes
  .addSetupWork(function loadDefaultIndexPattern(indexPatterns, Private, Promise, $route, config) {
    const rootSearchSource = Private(RootSearchSourceProvider);
    const getIds = Private(IndexPatternsGetIdsProvider);
    const route = _.get($route, 'current.$$route');

    return getIds()
    .then(function (patterns) {
      let defaultId = config.get('defaultIndex');
      let defined = !!defaultId;
      const exists = _.contains(patterns, defaultId);

      if (defined && !exists) {
        config.remove('defaultIndex');
        defaultId = defined = false;
      }

      if (!defined && route.requireDefaultIndex) {
        // If there is only one index pattern, set it as default
        if (patterns.length === 1) {
          defaultId = patterns[0];
          config.set('defaultIndex', defaultId);
        } else {
          throw new NoDefaultIndexPattern();
        }
      }

      // kibi: handle authorization errors when accessing the default index
      return notify.event('loading default index pattern', function loadIndexPattern(indexPattern) {
        const indexPatternId = indexPattern || defaultId;
        return indexPatterns.get(indexPatternId).then(function (pattern) {
          if (indexPatternId !== defaultId) {
            config.set('defaultIndex', indexPatternId);
            defaultId = indexPatternId;
          }
          rootSearchSource.getGlobalSource().set('index', pattern);
          notify.log('index pattern set to', indexPatternId);
        })
        .catch(err => {
          if (err instanceof IndexPatternAuthorizationError) {
            if (patterns.length) {
              return loadIndexPattern(patterns.pop());
            } else {
              // kibi: unset the defaultIndex since none of the known index patterns can be accessed
              config.remove('defaultIndex');
              throw new NoDefaultIndexPattern();
            }
          }
          throw err;
        });
      });
    });
  })
  .afterWork(
    // success
    null,

    // failure
    function (err, kbnUrl) {
      const hasDefault = !(err instanceof NoDefaultIndexPattern);
      if (hasDefault || !whenMissingRedirectTo) throw err; // rethrow

      kbnUrl.change(whenMissingRedirectTo);
      if (!defaultRequiredToasts) defaultRequiredToasts = [];
      else defaultRequiredToasts.push(notify.error(err));
    }
  );


};
