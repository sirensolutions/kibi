import uiModules from 'ui/modules';
import Clipboard from 'clipboard';
import '../styles/index.less';

uiModules.get('kibana')
.directive('shareObjectUrl', function (Private, createNotifier) {

  return {
    restrict: 'E',
    scope: {
      url: '=',
      shareAsEmbed: '=',
      kibiNavbarVisible: '=' // kibi: added to control when to show hide kibi-nav-bar
    },
    template: require('ui/share/views/share_object_url.html'),
    link: function ($scope, $el) {
      const notify = createNotifier({
        location: `Share ${$scope.$parent.objectType}`
      });

      $scope.textbox = $el.find('input.url')[0];
      $scope.clipboardButton = $el.find('button.clipboard-button')[0];

      const clipboard = new Clipboard($scope.clipboardButton, {
        target(trigger) {
          return $scope.textbox;
        }
      });

      clipboard.on('success', e => {
        notify.info('URL copied to clipboard.');
        e.clearSelection();
      });

      clipboard.on('error', () => {
        notify.info('URL selected. Press Ctrl+C to copy.');
      });

      $scope.$on('$destroy', () => {
        clipboard.destroy();
      });

      $scope.clipboard = clipboard;
    },
    controller: function ($scope) { // kibi: removed $location

      $scope.$watch('url', () => {
        $scope.formattedUrl = $scope.url;
        if ($scope.shareAsEmbed) {
          if ($scope.kibiNavbarVisible) {
            $scope.formattedUrl += '?embed=true&kibiNavbarVisible=true';
          } else {
            $scope.formattedUrl += '?embed=true';
          }
          $scope.formattedUrl = `<iframe src="${$scope.formattedUrl}" height="600" width="800"></iframe>`;
        }
      });

    }
  };
});
