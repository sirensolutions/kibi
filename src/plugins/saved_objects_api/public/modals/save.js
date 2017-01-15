import uiModules from 'ui/modules';

uiModules
.get('kibana')
.controller('SavedObjectsAPIModalSaveController', function ($scope, $timeout, $modalInstance, savedObjectService, savedObject,
                                                            createNotifier) {

  $scope.savedObject = savedObject;
  $scope.savedObjectService = savedObjectService;
  $scope.state = {
    title: savedObject.title,
    saving: false
  };

  const notify = createNotifier({
    location: 'Saved Objects API'
  });

  $scope.submit = function () {
    savedObject.title = savedObject.id = $scope.state.title;
    $scope.state.saving = true;
    $timeout(() => {
      savedObject.save()
      .then((id) => $modalInstance.close(savedObject))
      .catch((error) => {
        notify.error(error);
        $modalInstance.dismiss();
      });
    });
  };

  $scope.cancel = () => $modalInstance.dismiss(false);
});
