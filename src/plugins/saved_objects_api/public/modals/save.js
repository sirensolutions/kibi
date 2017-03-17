import uiModules from 'ui/modules';

uiModules
.get('kibana')
.controller('SavedObjectsAPIModalSaveController', function ($scope, $timeout, $modalInstance, savedObjectService, savedObject) {

  $scope.savedObject = savedObject;
  $scope.savedObjectService = savedObjectService;
  $scope.state = {
    title: savedObject.title,
    saving: false
  };

  $scope.submit = function () {
    savedObject.title = savedObject.id = $scope.state.title;
    $scope.state.saving = true;
    $timeout(() => {
      savedObject.save()
      .then((id) => $modalInstance.close(savedObject))
      .catch((error) => {
        $modalInstance.dismiss();
      });
    });
  };

  $scope.cancel = () => $modalInstance.dismiss(false);
});
