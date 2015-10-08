define(function (require) {
  require('modules').get('kibana')
  .directive('arrayParamAdd', function (Private) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

    return {
      require: 'ngModel',
      restrict: 'E',
      replace: true,
      scope: {
        label: '@',
        postAction: '&',
        default: '@' // used to define the default element added to the array. It is an empty object if unset
      },
      template: require('text!directives/array_param_add.html'),
      link: function ($scope, element, attrs, ngModelCtrl) {
        $scope.required = attrs.hasOwnProperty('required');

        $scope.array = ngModelCtrl.$modelValue ? ngModelCtrl.$modelValue : [];

        $scope.isValid = true;
        var validate = function () {
          $scope.isValid = !$scope.required || $scope.array.length !== 0;
          ngModelCtrl.$setValidity('arrayParam', $scope.isValid);
        };

        validate();
        $scope.$watch(function () {
          return ngModelCtrl.$modelValue;
        }, function () {
          $scope.array = ngModelCtrl.$modelValue ? ngModelCtrl.$modelValue : [];
          validate();
        }, true);

        $scope.addParam = function () {
          var el = {};
          if ($scope.default) {
            var json;
            try {
              json = JSON.parse($scope.default);
              el = json;
            } catch (err) {
            }
          }
          arrayHelper.add($scope.array, el, $scope.postAction);
          ngModelCtrl.$setViewValue($scope.array);
        };
      }
    };
  }).directive('arrayParamUp', function (Private) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

    return {
      restrict: 'E',
      replace: true,
      scope: {
        ngModel: '=',
        index: '@',
        postAction: '&'
      },
      template: '<button class="btn btn-xs btn-default" ng-click="upParam()" > <i class="fa fa-caret-up"></i> </button>',
      link: function ($scope, element, attrs) {
        $scope.upParam = function () {
          arrayHelper.up($scope.ngModel, $scope.index, $scope.postAction);
        };
      }
    };
  }).directive('arrayParamDown', function (Private) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

    return {
      restrict: 'E',
      replace: true,
      scope: {
        ngModel: '=',
        index: '@',
        postAction: '&'
      },
      template: '<button class="btn btn-xs btn-default" ng-click="downParam()" > <i class="fa fa-caret-down"></i> </button>',
      link: function ($scope, element, attrs) {
        $scope.downParam = function () {
          arrayHelper.down($scope.ngModel, $scope.index, $scope.postAction);
        };
      }
    };
  }).directive('arrayParamRemove', function (Private) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

    return {
      restrict: 'E',
      replace: true,
      scope: {
        ngModel: '=',
        index: '@',
        postAction: '&'
      },
      template: '<button class="btn btn-xs btn-danger" ng-click="removeParam()" > <i class="fa fa-times"></i> </button>',
      link: function ($scope, element, attrs) {
        $scope.removeParam = function () {
          arrayHelper.remove($scope.ngModel, $scope.index, $scope.postAction);
        };
      }
    };
  });
});

