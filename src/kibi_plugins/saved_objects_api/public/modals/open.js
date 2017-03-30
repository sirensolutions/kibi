import uiModules from 'ui/modules';

uiModules
.get('kibana')
.controller('SavedObjectsAPIModalOpenController', function ($scope, $timeout, $modalInstance, savedObjectService, createNotifier) {

  $scope.savedObjectService = savedObjectService;
  $scope.state = {
    opening: false
  };

  const notify = createNotifier({
    location: 'Saved Objects API'
  });

  $scope.open = function (savedObject) {
    if (savedObject) {
      $scope.state.opening = true;
      $timeout(() => {
        savedObjectService.get(savedObject.id)
        .then((savedObject) => $modalInstance.close(savedObject))
        .catch((error) => {
          notify.error(error);
          $modalInstance.dismiss();
        });
      });
    } else {
      $modalInstance.dismiss();
    }
  };

  $scope.cancel = () => $modalInstance.dismiss(false);
});
