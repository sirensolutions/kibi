import UiModules from 'ui/modules';

const openNewTab = function (url) {
  return new Promise ((resolve, reject) => {
    resolve(window.open(url));
  });
};

UiModules
.get('kibana')
.directive('kibiReload', function (kibiSession) {
  return {
    restrict: 'A',
    link: function (scope, element, attr) {
      element.bind('click', function (e) {
        e.stopPropagation();

        // to force reload put kibi-reload="true" in the html
        const forcedReload = new Boolean(attr.kibiReload);

        // clean the session
        kibiSession.putData({});

        openNewTab(window.location.origin).then((newTab) => {
          newTab.location.reload(forcedReload);
        });
      });
    }
  };
});
