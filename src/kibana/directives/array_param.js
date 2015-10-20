define(function (require) {
  require('modules').get('kibana')
  .directive('arrayParamAdd', function (Notifier, Private, arrayParamService) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));
    var notify = new Notifier({
      location: 'Array Param Directive'
    });

    return {
      restrict: 'E',
      replace: true,
      scope: {
        model: '=',
        disable: '=?',
        label: '@',
        postAction: '&',
        default: '@' // used to define the default element added to the array. It is an empty object if unset
      },
      template: require('text!directives/array_param_add.html'),
      link: function ($scope, element, attrs) {
        $scope.required = attrs.hasOwnProperty('required');

        arrayParamService.required = $scope.required;
        arrayParamService.label = $scope.label;

        if (!$scope.model) {
          notify.error('You must initialise the model for the button labelled "' + $scope.label + '" !');
          return;
        }

        $scope.addParam = function () {
          var el = {};
          if ($scope.default) {
            var json;
            try {
              json = JSON.parse($scope.default);
              el = json;
            } catch (err) {
              el = $scope.default;
            }
          }
          arrayHelper.add($scope.model, el, $scope.postAction);
        };

        // if it is required, add at least one element to the array
        if ($scope.required && $scope.model.length === 0) {
          $scope.addParam();
        }
      }
    };
  }).directive('arrayParamUp', function (Private) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

    return {
      restrict: 'E',
      replace: true,
      scope: {
        model: '=',
        index: '@',
        postAction: '&'
      },
      template: '<button class="btn btn-xs btn-default" ng-click="upParam()" > <i class="fa fa-caret-up"></i> </button>',
      link: function ($scope, element, attrs) {
        $scope.upParam = function () {
          arrayHelper.up($scope.model, $scope.index, $scope.postAction);
        };
      }
    };
  }).directive('arrayParamDown', function (Private) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));

    return {
      restrict: 'E',
      replace: true,
      scope: {
        model: '=',
        index: '@',
        postAction: '&'
      },
      template: '<button class="btn btn-xs btn-default" ng-click="downParam()" > <i class="fa fa-caret-down"></i> </button>',
      link: function ($scope, element, attrs) {
        $scope.downParam = function () {
          arrayHelper.down($scope.model, $scope.index, $scope.postAction);
        };
      }
    };
  }).directive('arrayParamRemove', function (Private, Notifier, arrayParamService) {
    var arrayHelper = Private(require('components/kibi/array_helper/array_helper'));
    var notify = new Notifier();

    return {
      restrict: 'E',
      replace: true,
      scope: {
        model: '=',
        index: '@',
        postAction: '&'
      },
      template: '<button class="btn btn-xs btn-danger" ng-click="removeParam()" > <i class="fa fa-times"></i> </button>',
      link: function ($scope, element, attrs) {
        $scope.removeParam = function () {
          if (!arrayParamService.required || $scope.model.length > 1) {
            arrayHelper.remove($scope.model, $scope.index, $scope.postAction);
          } else if (arrayParamService.required) {
            notify.warning('You need to add at least one ' + arrayParamService.label + '.');
          }
        };
      }
    };
  }).factory('arrayParamService', function () {
    return { required: false, label: '' };
  });
});
