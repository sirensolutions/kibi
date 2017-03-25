const app = require('ui/modules').get('kibana');
const Clipboard = require('clipboard');

require('../styles/index.less');

app.directive('shareObjectUrl', function (Private, createNotifier, sharingService) { // kibi: depend on sharing service

  return {
    restrict: 'E',
    scope: {
      getShareAsEmbed: '&shareAsEmbed',
      isKibiNavbarVisible:'&kibiNavbarVisible' // kibi: added to control when to show hide kibi-nav-bar
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
      function updateUrl(url) {
        $scope.url = url;

        if ($scope.shareAsEmbed) {
          $scope.formattedUrl = `<iframe src="${$scope.url}" height="600" width="800"></iframe>`;
        } else {
          $scope.formattedUrl = $scope.url;
        }

        $scope.shortGenerated = false;
      }

      $scope.shareAsEmbed = $scope.getShareAsEmbed();
      $scope.kibiNavbarVisible = $scope.isKibiNavbarVisible(); // kibi: added to control when to show hide kibi-nav-bar

      $scope.generateShortUrl = function () {
        if ($scope.shortGenerated) return;
        sharingService.generateShortUrl($scope.shareAsEmbed, $scope.kibiNavbarVisible) // kibi: use sharing service to shorten URL.
        .then(shortUrl => {
          updateUrl(shortUrl);
          $scope.shortGenerated = true;
        });
      };

      $scope.getUrl = function () {
        // kibi: use sharing service to fetch the current state URL.
        return sharingService.getSharedUrl($scope.shareAsEmbed, $scope.kibiNavbarVisible);
      };

      $scope.$watch('getUrl()', updateUrl);
    }
  };
});
