import Notifier from 'ui/notify/notifier';
import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import angular from 'angular';

let $scope;
let $elem;

describe('Kibi data table', function () {
  require('../kibi_data_table_vis_params');

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

      $elem = angular.element('<kibi-data-table-vis-params></kibi-data-table-vis-params>');
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
