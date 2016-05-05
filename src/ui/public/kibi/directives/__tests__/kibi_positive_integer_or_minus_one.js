var ngMock = require('ngMock');
var expect = require('expect.js');
var angular = require('angular');
require('../kibi_positive_integer_or_minus_one');

describe('Kibi Directives', function () {
  describe('kibi_positive_integer_or_minus_one', function () {
    var $rootScope;
    var $scope;
    var form;

    beforeEach(function () {
      // Load the application
      ngMock.module('kibana');

      ngMock.inject(function ($compile, $rootScope) {
        $scope = $rootScope;
        var element = angular.element(
          '<form name="form">' +
          '<input ng-model="model.somenum" name="somenum" kibi-positive-integer-or-minus-one />' +
          '</form>'
        );
        $scope.model = {
          somenum: null
        };
        $compile(element)($scope);
        form = $scope.form;
      });
    });

    it('should pass with positive integer', function () {
      form.somenum.$setViewValue('3');
      $scope.$digest();
      expect($scope.model.somenum).to.equal('3');
      expect(form.somenum.$valid).to.be(true);
    });

    it('should not pass with < -1', function () {
      form.somenum.$setViewValue('-2');
      $scope.$digest();
      expect($scope.model.somenum).to.equal('-2');
      expect(form.somenum.$valid).to.be(false);
    });

    it('should not pass with 0', function () {
      form.somenum.$setViewValue('0');
      $scope.$digest();
      expect($scope.model.somenum).to.equal('0');
      expect(form.somenum.$valid).to.be(false);
    });

    it('should not pass with string which is not a number', function () {
      form.somenum.$setViewValue('not');
      $scope.$digest();
      expect($scope.model.somenum).to.equal('not');
      expect(form.somenum.$valid).to.be(false);
    });

  });
});

