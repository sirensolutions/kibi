import _ from 'lodash';
import { Notifier } from 'ui/notify/notifier';
// kibi: IndexPatternAuthorizationError is added
import { IndexPatternAuthorizationError, NoDefaultIndexPattern, SavedObjectNotFound } from 'ui/errors';
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

    if (route.requireDefaultIndex) {
      const defaultId = config.get('defaultIndex');
      // kibi:
      // set the default indexPattern as it is required by the route
      // handle authorization errors
      notify.event('loading default index pattern');
      return kibiDefaultIndexPattern.getDefaultIndexPattern(defaultId)
      .then(indexPattern => {
        if (!indexPattern.id) {
          return kbnUrl.change('/management/siren/indexesandrelations/create/', {});
        };
        rootSearchSource.getGlobalSource().set('index', indexPattern);
        notify.log('index pattern set to', indexPattern.id);
      })
      .catch(err => {
        if (err instanceof SavedObjectNotFound) {
          notify.error('Could not locate default index pattern. (id: ' + err.savedObjectId + '). ' +
          'Make sure the value set in Advanced Settings matches an existing index pattern.');
        } else {
          notify.error(err);
        }
        return kbnUrl.change('/management/siren/indexesandrelations/create/', {});
      });
    }
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
