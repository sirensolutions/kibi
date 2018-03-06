import _ from 'lodash';
import { Notifier } from 'ui/notify/notifier';
// kibi: IndexPatternAuthorizationError is added
import { IndexPatternAuthorizationError, NoDefaultIndexPattern } from 'ui/errors';
import { IndexPatternsGetProvider } from '../_get';
import uiRoutes from 'ui/routes';

// kibi: imports
import { RootSearchSourceProvider } from 'ui/courier/data_source/_root_search_source';
// kibi: end

const notify = new Notifier({
  location: 'Index Patterns'
});

module.exports = function (opts) {
  opts = opts || {};
  const whenMissingRedirectTo = opts.whenMissingRedirectTo || null;
  let defaultRequiredToasts = null;

  // kibi: indexPatterns and kibiDefaultIndexPattern are added
  uiRoutes
  .addSetupWork(function loadDefaultIndexPattern(Private, Promise, $route, config, kibiDefaultIndexPattern, indexPatterns, kbnUrl) {
    const rootSearchSource = Private(RootSearchSourceProvider);
    const getIds = Private(IndexPatternsGetProvider)('id');
    const route = _.get($route, 'current.$$route');

    return getIds()
    .then(function (patterns) {
      // kibi: here using config.get('defaultIndex') is fine in other places use kibiDefaultIndexPattern service instead
      let defaultId = config.get('defaultIndex');
      let defined = !!defaultId;
      const exists = _.contains(patterns, defaultId);

      if (defined && !exists) {
        // kibi: do not try to delete the default as user might not have rights to do so
        defaultId = defined = false;
      }

      if (!defined && route.requireDefaultIndex) {
        // If there is only one index pattern, set it as default
        if (patterns.length === 1) {
          defaultId = patterns[0];
          // kibi: do not try to delete the default as user might not have rights to do so
        }

        // kibi:
        // set the default indexPattern as it is required by the route
        // handle authorization errors
        notify.event('loading default index pattern');
        return kibiDefaultIndexPattern.getDefaultIndexPattern(undefined, defaultId)
        .then(indexPattern => {
          if (!indexPattern.id) {
            return kbnUrl.change('/management/siren/indexesandrelations/create/', {});
          };
          rootSearchSource.getGlobalSource().set('index', indexPattern);
          notify.log('index pattern set to', indexPattern.id);
        });
      }
    }).catch(notify.error);
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
