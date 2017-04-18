import UiModules from 'ui/modules';

const openNewTab = function (url) {
  return new Promise ((resolve, reject) => {
    resolve(window.open(url + '/app/kibana#/?clearSirenSession=true', '_blank'));
  });
};

UiModules
.get('kibana')
.directive('kibiReload', function () {
  return {
    restrict: 'A',
    link: function (scope, element, attr) {
      element.bind('click', function (e) {
        e.stopPropagation();

        // to force reload put kibi-reload="true" in the html
        const forcedReload = new Boolean(attr.kibiReload);

        openNewTab(window.location.origin).then((newTab) => {
          newTab.location.reload(forcedReload);
        });
      });
    }
  };
});
