import UiModules from 'ui/modules';
import chrome from 'ui/chrome';
import EventsProvider from 'ui/events';
import Notifier from 'kibie/notify/notifier';
import hashUrl from './hash_url';


UiModules.get('kibana')
.run(($rootScope, $location, $window, $http, config, sirenSession) => {

  const notify = new Notifier({
    location: 'Kibi Session'
  });

  $rootScope.$on('$locationChangeSuccess', () => {
    const search = $location.search();
    if (search._h) {
      $http.get(chrome.getBasePath() + '/kibisession/' + search._h)
      .then((res) => {
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
          delete search._h;
          $location.search(search);
        }
      });
    }
  });
})
.service('sirenSession', ($location, Private) => {
  const Events = Private(EventsProvider);

  class KibiSession extends Events {
    constructor() {
      super();
      this.dataString = '{}';
    }

    getData() {
      if (this.dataString) {
        return JSON.parse(this.dataString);
      }
      return {};
    }

    getDataString() {
      return this.dataString;
    }

    putData(data, initial) {
      // storing locally so I can watch it
      this.dataString = JSON.stringify(data);
      if (initial) {
        this.emit('kibisession:loaded');
      } else {
        this.emit('kibisession:changed');
      }
    }

  }

  return new KibiSession();
});
