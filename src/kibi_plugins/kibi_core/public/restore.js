import uiRoutes from 'ui/routes';
import chrome from 'ui/chrome';
import { Notifier } from 'kibie/notify/notifier';
import { hashUrl } from 'ui/kibi/session/hash_url';

uiRoutes
.when('/kibi/restore/:sessionId', {
  resolve: {
    default: ($route, $location, $window, $http, config, sirenSession, kbnUrl) => {

      const notify = new Notifier({
        location: 'Kibi Session'
      });

      const defaultRedirect = () => kbnUrl.change('/');

      const sessionId = $route.current.params.sessionId;
      const search = $location.search();

      if (sessionId) {
        $http.get(`${chrome.getBasePath()}/sirensession/${sessionId}`)
        .then(res => {
          if (res.data.sirenSession) {
            sirenSession.putData(res.data.sirenSession, true);
          }
          let target = chrome.getBasePath() + res.data.url;
          if (res.data.url && config.get('state:storeInSessionStorage')) {
            try {
              target = chrome.getBasePath() + hashUrl(res.data.url);
            } catch (error) {
              notify.error(error);
              target = null;
            }
          }
          if (target) {
            if (search.embed === 'true') {
              target += '&embed=true';
            }
            if (search.kibiNavbarVisible === 'true') {
              target += '&kibiNavbarVisible=true';
            }
            $window.location.href = target;
          } else {
            return defaultRedirect();
          }
        })
        .catch(err => {
          notify.error(err);
          return defaultRedirect();
        });
      } else {
        return defaultRedirect();
      }
    }
  }
});
