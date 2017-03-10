import UiModules from 'ui/modules';
import chrome from 'ui/chrome';
import EventsProvider from 'ui/events';

UiModules.get('kibana')
.run(($rootScope, $location, $http, kibiSession) => {

  $rootScope.$on('$locationChangeSuccess', () => {
    const search = $location.search();
    if (search._h) {
      $http.get(chrome.getBasePath() + '/kibisession/' + search._h).then((res) => {
        if (res.data) {
          sessionStorage.setItem('kibiSession', JSON.stringify(res.data));
          kibiSession.emit('kibisession:loaded');
          delete search._s;
        }
      });
      $location.search(search);
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
