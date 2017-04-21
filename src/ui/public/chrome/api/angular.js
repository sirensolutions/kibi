import _ from 'lodash';
import { format as formatUrl, parse as parseUrl } from 'url';
import Notifier from 'kibie/notify/notifier'; // siren: import Kibi notifier
import kibiRemoveHashedParams from './kibi_remove_hashed_params'; // siren: import util to clean the url
import kibiRemoveSirenSession from './kibi_remove_siren_session'; // siren: import util to clean the sirenSession
import { UrlOverflowServiceProvider } from '../../error_url_overflow';
import { isStateHash } from 'ui/state_management/state_storage';

const URL_LIMIT_WARN_WITHIN = 1000;
const MAX_RESTORE_SESSION_TIME = 2000;
const IE_REGEX = /(; ?MSIE |Edge\/\d|Trident\/[\d+\.]+;.*rv:*11\.\d+)/;
const HASHED_URL_REGEX = /[_gak]+=h@[a-f0-9]+/g;
const CLEAR_SIREN_SESSION_REGEX = /clearSirenSession=true/g;

module.exports = function (chrome, internals) {
  let isIE = false;
  let restoreSession = false;
  let sessionRestored = false;
  let hashedUrl = false;
  let hasSirenSession = false;
  const isEmptySession = !sessionStorage.length;

  // siren: our initialization code that have to be executed before kibana starts
  chrome.sirenInitialization = function () {
    return new Promise((resolve, reject) => {
      const pollUntil = require('ui/kibi/helpers/_poll_until');
      const url = decodeURIComponent(window.location.href);
      const SIREN_SESSION_NAME = 'sirenSession';
      const sessionId = Math.floor(Math.random() * 10000);

      restoreSession = !CLEAR_SIREN_SESSION_REGEX.test(url);
      isIE = window.navigator.userAgent.match(IE_REGEX);
      hashedUrl = url.match(HASHED_URL_REGEX);

      if (isIE) {
        resolve();
        return;
      }

      if (hashedUrl && isEmptySession && restoreSession) {
        // Ask the old tabs for session storage
        localStorage.setItem('getSessionStorage', JSON.stringify({
          id: sessionId,
          hurl: hashedUrl.join('&')
        }));
      };
      window.addEventListener('storage', event => {
        if (event.key === 'getSessionStorage') {
          if (event.newValue && event.newValue !== '') {
            const request = JSON.parse(event.newValue);
            hashedUrl = decodeURIComponent(window.location.href).match(HASHED_URL_REGEX);
            if (request.hurl === hashedUrl.join('&')) {
              // New tab asked for the sessionStorage -> send it
              const data = {};
              for (const key in sessionStorage) {
                if (sessionStorage.hasOwnProperty(key)) {
                  if (key !== SIREN_SESSION_NAME) {
                    data[key] = sessionStorage[key];
                  } else {
                    data.hasSirenSession = true;
                  }
                }
              }
              localStorage.setItem('sessionStorage', JSON.stringify({
                id: request.id,
                hurl: request.hurl,
                session: data
              }));
              localStorage.removeItem('sessionStorage');
            }
          }
        } else if (event.key === 'sessionStorage' && restoreSession) {
          // THe old tab sent the sessionStorage -> restore it
          if (event.newValue && event.newValue !== '') {
            hashedUrl = decodeURIComponent(window.location.href).match(HASHED_URL_REGEX);
            let data = JSON.parse(event.newValue);
            if (data && hashedUrl
              && data.id === sessionId
              && data.hurl === hashedUrl.join('&')
              && !sessionRestored) {
              data = data.session;
              for (const key in data) {
                if (data.hasOwnProperty(key)) {
                  if (key !== 'hasSirenSession') {
                    sessionStorage.setItem(key, data[key]);
                  } else {
                    hasSirenSession = true;
                  }
                }
              }
              sessionRestored = _.size(data) > 0;
            }
          }
        }
      });

      if (!hashedUrl) {
        resolve();
        return;
      }

      pollUntil(() => {
        return sessionRestored === true;
      }, MAX_RESTORE_SESSION_TIME, 5, (error) => {
        resolve();
      });
    });
  };
  // siren: end

  chrome.setupAngular = function () {
    const modules = require('ui/modules');
    const kibana = modules.get('kibana');

    _.forOwn(chrome.getInjected(), function (val, name) {
      kibana.value(name, val);
    });

    kibana
    .value('kbnVersion', internals.version)
    .value('kibiVersion', internals.kibiVersion) // siren: added to manage kibi version
    .value('kibiEnterpriseEnabled', internals.kibiEnterpriseEnabled) // siren:
    .value('kibiKibanaAnnouncement', internals.kibiKibanaAnnouncement) // siren:
    .value('buildNum', internals.buildNum)
    .value('buildSha', internals.buildSha)
    .value('sessionId', Date.now())
    .value('esUrl', (function () {
      const a = document.createElement('a');
      a.href = chrome.addBasePath('/elasticsearch');
      return a.href;
    }()))
    .config(($httpProvider) => {
      // siren: clean the hashed params from the URL if session storage empty
      const originalURL = decodeURIComponent(window.location.href);
      let url = kibiRemoveHashedParams(originalURL, sessionStorage);
      url = kibiRemoveSirenSession(url, sessionStorage);
      if (originalURL !== url) {
        window.location.href = url;
      }
      // siren: end
      chrome.$setupXsrfRequestInterceptor($httpProvider);
    })
    .run(($location, $rootScope, Private, createNotifier) => {
      const _notify = createNotifier();
      if (restoreSession && hashedUrl) {
        if (isIE && isEmptySession) {
          _notify.error('In IE we cannot restore your previous filters in this tab');
        } else if (hasSirenSession && sessionRestored) {
          let msg = 'Note: in this new tab you have all the previous filters but not the content of any Graph Browser. ';
          msg += 'To get a link which would contain also the full graph content use the share link feature.';
          _notify.warning(msg);
        }
      }

      const notify = new Notifier();
      const urlOverflow = Private(UrlOverflowServiceProvider);
      const check = (event) => {
        if ($location.path() === '/error/url-overflow') return;

        try {
          if (urlOverflow.check($location.absUrl()) <= URL_LIMIT_WARN_WITHIN) {
            notify.directive({
              template: `
                <p>
                  The URL has gotten big and may cause Kibana
                  to stop working. Please either enable the
                  <code>state:storeInSessionStorage</code>
                  option in the <a href="#/management/kibana/settings">advanced
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

    require('../directives')(chrome, internals);

    modules.link(kibana);
  };

};
