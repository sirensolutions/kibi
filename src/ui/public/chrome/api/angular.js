import _ from 'lodash';
import { format as formatUrl, parse as parseUrl } from 'url';

import modules from 'ui/modules';
import Notifier from 'kibie/notify/notifier'; // kibi: import Kibi notifier
import kibiRemoveHashedParams from './kibi_remove_hashed_params'; // kibi: import util to clean the url
import { UrlOverflowServiceProvider } from '../../error_url_overflow';

import directivesProvider from '../directives';

const URL_LIMIT_WARN_WITHIN = 1000;

export default function (chrome, internals) {
  chrome.getFirstPathSegment = _.noop;
  chrome.getBreadcrumbs = _.noop;

  chrome.setupAngular = function () {
    const kibana = modules.get('kibana');

    _.forOwn(chrome.getInjected(), function (val, name) {
      kibana.value(name, val);
    });

    kibana
    .value('kbnVersion', internals.version)
    .value('kibiVersion', internals.kibiVersion) // kibi: added to manage kibi version
    .value('kibiEnterpriseEnabled', internals.kibiEnterpriseEnabled) // kibi:
    .value('kibiKibanaAnnouncement', internals.kibiKibanaAnnouncement) // kibi:
    .value('buildNum', internals.buildNum)
    .value('buildSha', internals.buildSha)
    .value('serverName', internals.serverName)
    .value('uiSettings', internals.uiSettings)
    .value('sessionId', Date.now())
    .value('chrome', chrome)
    .value('esUrl', (function () {
      const a = document.createElement('a');
      a.href = chrome.addBasePath('/elasticsearch');
      return a.href;
    }()))
    .value('esAdminUrl', (function () {
      const a = document.createElement('a');
      a.href = chrome.addBasePath('/es_admin');
      return a.href;
    }()))
    .config(($httpProvider) => {
      // kibi: clean the hashed params from the URL if session storage empty
      const url = kibiRemoveHashedParams(window.location.href, sessionStorage);
      if (url) {
        window.location.href = url;
      }
      // kibi:
      chrome.$setupXsrfRequestInterceptor($httpProvider);
    })
    .config(['$compileProvider', function ($compileProvider) {
      if (!internals.devMode) {
        $compileProvider.debugInfoEnabled(false);
      }
    }])
    .run(($location, $rootScope, Private, config) => {
      chrome.getFirstPathSegment = () => {
        return $location.path().split('/')[1];
      };

      chrome.getBreadcrumbs = () => {
        const path = $location.path();
        let length = path.length - 1;

        // trim trailing slash
        if (path.charAt(length) === '/') {
          length--;
        }

        return path.substr(1, length)
          .split('/');
      };

      const notify = new Notifier();
      const urlOverflow = Private(UrlOverflowServiceProvider);
      const check = () => {
        // disable long url checks when storing state in session storage
        if (config.get('state:storeInSessionStorage')) return;
        if ($location.path() === '/error/url-overflow') return;

        try {
          if (urlOverflow.check($location.absUrl()) <= URL_LIMIT_WARN_WITHIN) {
            notify.directive({
              template: `
                <p>
                  The URL has gotten big and may cause Kibana
                  to stop working. Please either enable the
                  <code>state:storeInSessionStorage</code>
                  option in the <a href="#/management/siren/settings">advanced
                  settings</a> or simplify the onscreen visuals.
                </p>
              `
            }, {
              type: 'error',
              actions: [{ text: 'close' }]
            });
          }
        } catch (e) {
          const { host, path, search, protocol } = parseUrl(window.location.href);
          // rewrite the entire url to force the browser to reload and
          // discard any potentially unstable state from before
          window.location.href = formatUrl({ host, pathname: path, search, protocol, hash: '#/error/url-overflow' });
        }
      };

      $rootScope.$on('$routeUpdate', check);
      $rootScope.$on('$routeChangeStart', check);
    });

    directivesProvider(chrome, internals);

    modules.link(kibana);
  };

}
