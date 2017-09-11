import Notifier from 'ui/notify/notifier';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';
import angular from 'angular';
import '../kibi_data_table_vis_params';

describe('Kibi data table params', function () {
  let $scope;

  function init(params) {
    ngMock.module('kibi_datasources/services/saved_datasources', function ($provide) {
      $provide.service('savedDatasources', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDatasources', []));
    });
    ngMock.module('apps/management');
    ngMock.inject(function ($rootScope, $compile) {
      $scope = $rootScope.$new();
      $scope.vis = {
        params: params
      };

      const $elem = angular.element('<kibi-data-table-vis-params></kibi-data-table-vis-params>');
      $compile($elem)($scope);

      $scope.$digest();
    });
  }

  describe('column aliases duplicate validator', function () {
    afterEach(function () {
      $scope.$destroy();
      Notifier.prototype._notifs.length = 0;
    });

    it('should be valid when unique aliases', function () {
      const params = {
        enableColumnAliases: true,
        columns: ['A','B','C'],
        columnAliases: ['D','F','E']
      };
      init(params);

      $scope.columnAliasesValidation();
      expect($scope.columnAliasesValid).to.equal(true);
    });

    it('should be invalid when duplicate aliases', function () {
      const params = {
        enableColumnAliases: true,
        columns: ['A','B','C'],
        columnAliases: ['A','A','C']
      };
      init(params);

      $scope.columnAliasesValidation();
      expect($scope.columnAliasesValid).to.equal('');
    });
  });
});
