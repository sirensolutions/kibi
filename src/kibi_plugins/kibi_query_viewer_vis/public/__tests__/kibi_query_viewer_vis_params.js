import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import angular from 'angular';


describe('Kibi Controllers', function () {
  require('../kibi_query_viewer_vis_params');

  let $scope;
  let $elem;
  function init() {

    ngMock.module('kibi_datasources/services/saved_datasources', function ($provide) {
      $provide.service('savedDatasources', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDatasources', []));
    });

    ngMock.module('templates_editor/services/saved_templates', function ($provide) {
      $provide.service('savedTemplates', (Promise, Private) => mockSavedObjects(Promise, Private)('savedTemplates', []));
    });

    ngMock.module('queries_editor/services/saved_queries', function ($provide) {
      $provide.service('savedQueries', (Promise, Private) => mockSavedObjects(Promise, Private)('savedQueries', []));
    });

    ngMock.module('kibana', function ($provide) {
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardTitle', '');
    });

    ngMock.module('apps/management');

    ngMock.inject(function ($rootScope, $compile) {
      $scope = $rootScope.$new();
      $scope.vis = {
        params: {
          queryDefinitions: [{}]
        }
      };

      $elem = angular.element('<kibi-query-viewer-vis-params></kibi-query-viewer-vis-params>');
      $compile($elem)($scope);

      $scope.$digest();
    });
  }

  describe('Kibi query viewer vis params directive', function () {

    beforeEach(init);

    describe('Testing if templateChanged and labelChanged are triggered', function () {
      it('templateChanged should be triggered when editing template', function () {
        const spy = sinon.spy($scope, 'templateChanged');
        const ngModelController = $elem.find('#templateVars-0').controller('ngModel');
        ngModelController.$setViewValue('test');
        $scope.$digest();
        sinon.assert.calledOnce(spy);
      });

      it('labelChanged should be triggered when editing label', function () {
        const spy = sinon.spy($scope, 'labelChanged');
        $elem.find('input[type=text]').change();
        $scope.$digest();
        sinon.assert.calledOnce(spy);
      });
    });

    describe('Testing logic when label is changed', function () {

      // Note: below we trigger the templateChanged and labelChanged manually to simplify tests

      it('should set _label when label property is set in _templateVarsString', function () {
        $scope.vis.params.queryDefinitions[0]._templateVarsString = JSON.stringify({label: 'value changed in template vars'});
        $scope.templateChanged();
        const actual = $scope.vis.params.queryDefinitions[0]._label;
        expect(actual).to.equal('value changed in template vars');
      });

      it('should reset _label when label property is set in _templateVarsString set to empty string', function () {
        $scope.vis.params.queryDefinitions[0]._templateVarsString = JSON.stringify({label: ''});
        $scope.templateChanged();
        const actual = $scope.vis.params.queryDefinitions[0]._label;
        expect(actual).to.equal('');
      });

      it('should set label in _templateVarsString when _label changed', function () {
        $scope.vis.params.queryDefinitions[0]._label = 'value changed in label';
        $scope.labelChanged(0);
        const actual = JSON.parse($scope.vis.params.queryDefinitions[0]._templateVarsString);
        expect(actual).to.eql({label: 'value changed in label'});
      });

      it('should reset label in _templateVarsString when _label changed to an empty string', function () {
        $scope.vis.params.queryDefinitions[0]._label = '';
        $scope.labelChanged(0);
        const actual = JSON.parse($scope.vis.params.queryDefinitions[0]._templateVarsString);
        expect(actual).to.eql({label: ''});
      });
    });
  });

});
