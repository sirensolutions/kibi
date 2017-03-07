import UiModules from 'ui/modules';
import chrome from 'ui/chrome';

UiModules.get('kibana')
.run(($rootScope, $location, kbnIndex, es) => {
  $rootScope.$on('$locationChangeSuccess', () => {
    const search = $location.search();
    if (search._h) {
      es.get({
        index: kbnIndex,
        type: 'url',
        id: search._s
      }).then((res) => {
        if (res.data._source && res.data._source.kibiSession) {
          sessionStorage.setItem('kibiSession', JSON.stringify(res.data._source.kibiSession));
        }
      });
      delete search._s;
      $location.search(search);
    }
  });
})
.service('kibiSession', ($location) => {

  class KibiSession {
    getData() {
      const data = sessionStorage.getItem('kibiSession');
      if (data) {
        return JSON.parse(data);
      }
      return {};
    }

    putData(data) {
      sessionStorage.setItem('kibiSession', JSON.stringify(data));
    }
  }

  return new KibiSession();
});
