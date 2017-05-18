let _ = require('lodash');
let { IndexPatternAuthorizationError, NoDefaultIndexPattern, NoDefinedIndexPatterns } = require('ui/errors');
let Notifier = require('kibie/notify/notifier');
let notify = new Notifier({
  location: 'Index Patterns'
});

module.exports = function (opts) {
  opts = opts || {};
  let notRequiredRe = opts.notRequiredRe || null;
  let whenMissingRedirectTo = opts.whenMissingRedirectTo || null;
  let defaultRequiredToasts = null;

  require('ui/routes')
  .addSetupWork(function loadDefaultIndexPattern(Private, Promise, $route, config, indexPatterns) {
    let getIds = Private(require('../_get_ids'));
    let rootSearchSource = Private(require('ui/courier/data_source/_root_search_source'));
    let path = _.get($route, 'current.$$route.originalPath');

    return config.init()
    .then(function () {
      return getIds();
    })
    .then(function (patterns) {
      let defaultId = config.get('defaultIndex');
      let defined = !!defaultId;
      let exists = _.contains(patterns, defaultId);
      let required = !notRequiredRe || !path.match(notRequiredRe);

      if (defined && !exists) {
        config.clear('defaultIndex');
        defaultId = defined = false;
      }

      if (!defined && required) {
        throw new NoDefaultIndexPattern();
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
              config.set('defaultIndex');
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
      let hasDefault = !(err instanceof NoDefaultIndexPattern);
      if (hasDefault || !whenMissingRedirectTo) throw err; // rethrow

      kbnUrl.change(whenMissingRedirectTo);
      if (!defaultRequiredToasts) defaultRequiredToasts = [];
      else defaultRequiredToasts.push(notify.error(err));
    }
  );


};
