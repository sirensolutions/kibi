import MockState from 'fixtures/mock_state';
import sinon from 'auto-release-sinon';
import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import * as onPage from 'ui/kibi/utils/on_page';
import 'ui/kibi/directives/kibi_param_entity_uri';

let Notifier;
let $scope;
let esStub;
let kibiState;
let $rootScope;

const init = function () {
  ngMock.module('kibana', function ($compileProvider, $provide) {
    $provide.constant('kbnDefaultAppId', '');
    $provide.constant('kibiDefaultDashboardTitle', '');
    $provide.constant('kibiDatasourcesSchema', {});

    $compileProvider.directive('kibiSelect', function () {
      return {
        priority: 100,
        terminal: true,
        restrict:'E',
        template:'<div></div>',
      };
    });
  });

  // Create the scope
  ngMock.inject(function (_kibiState_, _Notifier_, es, _$rootScope_, $compile) {
    $rootScope = _$rootScope_;
    sinon.stub(onPage, 'onVisualizePage').returns(true);
    kibiState = _kibiState_;
    esStub = sinon.stub(es, 'search');

    Notifier = _Notifier_;
    sinon.stub(Notifier.prototype, 'warning');
    sinon.stub(Notifier.prototype, 'error');

    const entityParamUri = '<kibi-param-entity-uri entity-uri-holder="holder"></kibi-param-entity-uri>';
    const $elem = $compile(entityParamUri)($rootScope);
    $scope = $elem.isolateScope();
  });
};

describe('Kibi Directives', function () {
  describe('kibi-param-entity-uri directive', function () {

    beforeEach(init);

    describe('Set entity from KibiState', function () {
      it('should set the selected entity displayed by the directive', function () {
        kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c', column: 'area' });
        $scope.updateSelectedEntity();

        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be('a');
        expect($scope.c.index).to.be('a');
        expect($scope.c.type).to.be('b');
        expect($scope.c.id).to.be('c');
      });

      it('should not overwrite the indexPattern in case of wildcard', function () {
        $scope.c.indexPattern = 'a*';
        kibiState.setEntityURI({ index: 'a-1', type: 'b', id: 'c', column: 'area' });
        $scope.updateSelectedEntity();

        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be('a*');
        expect($scope.c.index).to.be('a-1');
        expect($scope.c.type).to.be('b');
        expect($scope.c.id).to.be('c');
      });

      it('should clear the selected entity displayed by the directive if the kibistate does not have any saved entity', function () {
        kibiState.setEntityURI();
        $scope.updateSelectedEntity();

        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be(null);
      });
    });

    describe('Update KibiState with the entity set via the directive', function () {
      it('should update the KibiState saved entity', function () {
        $scope.updateKibiState('a', 'b', 'c');
        expect(kibiState.getEntityURI()).to.eql({
          index: 'a',
          type: 'b',
          id: 'c',
          column: undefined
        });
      });

      it('should handle a wildcard index pattern', function () {
        esStub.returns(Promise.resolve({
          hits: {
            total: 1,
            hits: [
              {
                _index: 'a-1',
                _type: 'b1',
                _id: 'c'
              }
            ]
          }
        }));

        return $scope.updateKibiState('a*', 'b1', 'c')
        .then(() => {
          sinon.assert.notCalled(Notifier.prototype.warning);
          sinon.assert.notCalled(Notifier.prototype.error);
          // the empty saved entity in the KibiState will reset the selected entity in the directive
          expect(kibiState.getEntityURI()).to.eql({
            index: 'a-1',
            type: 'b1',
            id: 'c',
            column: undefined
          });
        });
      });

      it('should handle a wildcard query returning more than one hit for the sample selection', function () {
        esStub.returns(Promise.resolve({
          hits: {
            total: 2,
            hits: [
              {
                _index: 'm-1',
                _type: 't',
                _id: 'c'
              },
              {
                _index: 'm-2',
                _type: 't',
                _id: 'c'
              }
            ]
          }
        }));

        return $scope.updateKibiState('two-and-more-*', 't', 'c')
        .then(() => {
          sinon.assert.called(Notifier.prototype.warning);
          sinon.assert.notCalled(Notifier.prototype.error);
          // the empty saved entity in the KibiState will reset the selected entity in the directive
          expect(kibiState.getEntityURI()).to.eql({
            index: 'm-1',
            type: 't',
            id: 'c',
            column: undefined
          });
        });
      });

      it('should handle a wildcard query returning no hits for the sample selection', function () {
        esStub.returns(Promise.resolve({
          hits: {
            total: 0,
            hits: []
          }
        }));

        return $scope.updateKibiState('empty-*', 't', 'c')
        .then(() => {
          sinon.assert.called(Notifier.prototype.warning);
          sinon.assert.notCalled(Notifier.prototype.error);
          // the empty saved entity in the KibiState will reset the selected entity in the directive
          expect(kibiState.getEntityURI()).to.be(undefined);
        });
      });

      it('should handle an ES error', function () {
        const mappings = [
          {
            pattern: 'error-*',
            index: 'e-1',
            type: 't'
          },
          {
            pattern: 'error-*',
            index: 'e-2',
            type: 't'
          }
        ];
        esStub.returns(Promise.reject(new Error('Elasticsearch error')));

        return $scope.updateKibiState('error-*', 't', 'c')
        .then(() => {
          sinon.assert.notCalled(Notifier.prototype.warning);
          sinon.assert.called(Notifier.prototype.error);
          // the empty saved entity in the KibiState will reset the selected entity in the directive
          expect(kibiState.getEntityURI()).to.be(undefined);
        });
      });
    });

    describe('Update entity components when some of the elements are changed', function () {
      beforeEach(function () {
        kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c' });
        kibiState.save();

        $rootScope.$digest();

        expect($scope.c).to.be.ok();
        expect($scope.c.indexPattern).to.be('a');
        expect($scope.c.index).to.be('a');
        expect($scope.c.type).to.be('b');
        expect($scope.c.id).to.be('c');
      });

      it('should unset the type and set the index when the index pattern is changed', function () {
        $scope.c.indexPattern = 'a-1';

        $rootScope.$digest();

        expect($scope.c.index).to.be('a-1');
        expect($scope.c.type).to.be.null;
        expect($scope.c.id).to.be.null;
        expect($scope.c.extraIndexPatternItems).to.have.length(0);
        expect($scope.c.extraTypeItems).to.have.length(0);
        expect($scope.c.extraIdItems).to.have.length(0);
      });

      it('should unset id related parameter when type is changed', function () {
        $scope.c.type = 'b2';
        $rootScope.$digest();

        expect($scope.c.indexPattern).to.be('a');
        expect($scope.c.type).to.be('b2');
        expect($scope.c.id).to.be.null;
        expect($scope.c.extraIdItems).to.have.length(0);
      });
    });
  });
});
