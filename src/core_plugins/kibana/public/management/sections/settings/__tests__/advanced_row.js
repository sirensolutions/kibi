import angular from 'angular';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import _ from 'lodash';

let $scope;
let element;
let $compile;

describe('Advanced Row', function () {

  const invalidConf = {
    name: 'inValid',
    defVal: 1,
    unsavedValue: -1,
    validator: 'positiveIntegerValidator',
  };

  const validConf = {
    name: 'valid',
    defVal: 1,
    unsavedValue: 20,
    validator: 'positiveIntegerValidator',
  };

  beforeEach(function () {
    ngMock.module('apps/management');
    ngMock.inject(function (_$compile_, _$rootScope_,) {
      $compile = _$compile_;
      $scope = _$rootScope_.$new();
      $scope.configs = [validConf, invalidConf];
      element = $compile('<div advanced-row="conf" configs="configs"></div>')($scope);
      $scope.$digest();
    });
  });

  afterEach(function () {
    $scope.$destroy();
  });

  it('should return Error when given invalid value', function () {
    $scope.conf = invalidConf;
    expect(element.isolateScope().validator($scope.conf.validator, $scope.conf.unsavedValue)).to.be.an(Error);

  });

  it('should update config value when given valid value', function () {
    $scope.conf = validConf;
    expect(element.isolateScope().validator($scope.conf.validator, $scope.conf.unsavedValue)).to.equal(20);
  });
});
