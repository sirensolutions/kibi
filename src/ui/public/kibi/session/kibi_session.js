import UiModules from 'ui/modules';
import chrome from 'ui/chrome';
import EventsProvider from 'ui/events';

UiModules.get('kibana')
.run(($rootScope, $location, $window, $http, kibiSession) => {

  $rootScope.$on('$locationChangeSuccess', () => {
    const search = $location.search();
    if (search._h) {
      $http.get(chrome.getBasePath() + '/kibisession/' + search._h)
      .then((res) => {
        if (res.data.kibiSession) {
          sessionStorage.setItem('kibiSession', JSON.stringify(res.data.kibiSession));
          kibiSession.emit('kibisession:loaded');
        }
        if (res.data.url) {
          $window.location.href = res.data.url;
        }
      });
    }
  });
})
.service('kibiSession', ($location, Private) => {
  const Events = Private(EventsProvider);

  class KibiSession extends Events {
    constructor() {
      super();
      this.dataString = '{}';
    }

    getData() {
      const data = sessionStorage.getItem('kibiSession');
      if (data) {
        return JSON.parse(data);
      }
      return {};
    }

    getDataString() {
      return this.dataString;
    }

    putData(data) {
      // storing locally so I can watch it
      this.dataString = JSON.stringify(data);
      sessionStorage.setItem('kibiSession', this.dataString);
      this.emit('kibisession:changed');
    }

  }

  return new KibiSession();
});
