import MockState from 'fixtures/mock_state';
import sinon from 'auto-release-sinon';
import angular from 'angular';
import _ from 'lodash';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import * as onPage from 'ui/kibi/utils/on_page';
import 'ui/kibi/directives/kibi_param_entity_uri';
import SavedObjectProvider from 'ui/courier/saved_object/saved_object';

let $httpBackend;
let Notifier;
let $scope;

const init = function (entityURI, mappings) {
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

  ngMock.module('kibana/courier', function ($provide) {
    $provide.service('courier', function (Promise, Private) {
      return {
        SavedObject: Private(SavedObjectProvider),
        indexPatterns: {
          getIds: function () {
            return Promise.resolve(_.map(mappings, function (m) {
              return m.pattern;
            }));
          }
        }
      };
    });
  });

  // Create the scope
  ngMock.inject(function (kibiState, $injector, $rootScope, $compile) {
    sinon.stub(onPage, 'onVisualizePage').returns(true);

    const entityParamUri = '<kibi-param-entity-uri entity-uri-holder="holder"></kibi-param-entity-uri>';
    const ids = { hits: { hits: [] } };

    Notifier = $injector.get('Notifier');
    sinon.stub(Notifier.prototype, 'warning');
    sinon.stub(Notifier.prototype, 'error');
    $httpBackend = $injector.get('$httpBackend');

    _.each(mappings, function (m) {
      // data for getTypes of st_select_helper
      $httpBackend.whenGET('/elasticsearch/' + m.index + '/_mappings').respond(200);
      // data for getDocumentIds of st_select_helper
      $httpBackend.whenGET('/elasticsearch/' + m.index + '/' + m.type + '/_search?size=10').respond(200, ids);
    });

    const parts = entityURI.split('/');
    if (parts.length && parts[0].indexOf('*') !== -1) {
      const indexPatterns = _.filter(mappings, 'pattern', parts[0]);
      const mappingsObject = _.zipObject(
        _.pluck(indexPatterns, 'index'),
        _.map(indexPatterns, function (ip) {
          const val = { mappings: {} };
          val.mappings[ip.type] = {};
          return val;
        })
      );


      // data for getTypes of st_select_helper
      $httpBackend.whenGET('/elasticsearch/' + parts[0] + '/_mappings').respond(200, mappingsObject);
      // data for getDocumentIds of st_select_helper
      $httpBackend.whenGET('/elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?size=10').respond(200, ids);

      // responses to wildcard id queries
      if (parts[0] === 'two-and-more-*') {
        // more than one result
        $httpBackend.whenGET('/elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(200, {
          hits: {
            total: 2,
            hits: [
              {
                _index: mappings[0].index,
                _type: mappings[0].type,
                _id: parts[2]
              },
              {
                _index: mappings[0].index,
                _type: mappings[0].type,
                _id: parts[2]
              }
            ]
          }
        });
      } else if (parts[0] === 'empty-*') {
        $httpBackend.whenGET('/elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(200, {
          hits: {
            total: 0,
            hits: []
          }
        });
      } else if (parts[0] === 'error-*') {
        $httpBackend.whenGET('/elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(500);
      } else {
        // one result
        $httpBackend.whenGET('/elasticsearch/' + parts[0] + '/' + parts[1] + '/_search?q=_id:' + parts[2]).respond(200, {
          hits: {
            total: 1,
            hits: [
              {
                _index: mappings[0].index,
                _type: mappings[0].type,
                _id: parts[2]
              }
            ]
          }
        });
      }
    }

    const $elem = angular.element(entityParamUri);
    $compile($elem)($rootScope);
    $rootScope.$digest();
    kibiState.setEntityURI(entityURI);
    kibiState.save();
    $rootScope.$digest();
    $scope = $elem.isolateScope();
  });
};

describe('Kibi Directives', function () {
  describe('kibi-param-entity-uri directive', function () {

    it('should set the scope object correctly', function () {
      const mappings = [
        {
          pattern: 'a',
          index: 'a',
          type: 'b'
        }
      ];

      init('a/b/c/area', mappings);

      expect(Notifier.prototype.warning.called).to.be(false);
      expect($scope.c).to.be.ok();
      expect($scope.c.indexPattern).to.be('a');
      expect($scope.c.index).to.be('a');
      expect($scope.c.type).to.be('b');
      expect($scope.c.id).to.be('c');
    });

    it('should handle a wildcard index pattern', function () {
      const mappings = [
        {
          pattern: 'a*',
          index: 'a-1',
          type: 'b1'
        },
        {
          pattern: 'a*',
          index: 'a-2',
          type: 'b2'
        }
      ];

      init('a*/b1/c/area', mappings);
      $httpBackend.flush();

      expect(Notifier.prototype.warning.called).to.be(false);
      expect($scope.c).to.be.ok();
      expect($scope.c.indexPattern).to.be('a*');
      expect($scope.c.index).to.be('a-1');
      expect($scope.c.type).to.be('b1');
      expect($scope.c.id).to.be('c');
    });

    it('should unset the type and set the index when the index pattern is changed', function () {
      const mappings = [
        {
          pattern: 'a*',
          index: 'a-1',
          type: 'b1'
        },
        {
          pattern: 'a*',
          index: 'a-2',
          type: 'b2'
        }
      ];

      init('a*/b1/c/area', mappings);

      $scope.c.indexPattern = 'a-1';

      $httpBackend.flush();

      expect($scope.c.index).to.be('a-1');
      expect($scope.c.type).to.be.null;
    });

    it('should unset id related parameter when index pattern is changed', function () {
      const mappings = [
        {
          pattern: 'a*',
          index: 'a-1',
          type: 'b1'
        },
        {
          pattern: 'a*',
          index: 'a-2',
          type: 'b2'
        }
      ];

      init('a*/b1/c/area', mappings);

      $scope.c.indexPattern = 'a-1';

      $httpBackend.flush();

      expect($scope.c.index).to.be('a-1');
      expect($scope.c.type).to.be.empty;
      expect($scope.c.id).to.be.empty;
      expect($scope.c.extraIdItems.length).to.be(0);
    });

    it('should unset id related parameter when type is changed', function () {
      const mappings = [
        {
          pattern: 'a*',
          index: 'a-1',
          type: 'b1'
        },
        {
          pattern: 'a*',
          index: 'a-2',
          type: 'b2'
        }
      ];

      init('a-1/b1/c/area', mappings);

      $scope.c.type = '';
      $scope.$digest();

      expect($scope.c.indexPattern).to.be('a-1');
      expect($scope.c.type).to.be.empty;
      expect($scope.c.id).to.be.empty;
      expect($scope.c.extraIdItems.length).to.be(0);
    });

    it('should handle a wildcard query returning more than one hit for the sample selection', function () {
      const mappings = [
        {
          pattern: 'two-and-more-*',
          index: 'm-1',
          type: 't'
        },
        {
          pattern: 'two-and-more-*',
          index: 'm-2',
          type: 't'
        }
      ];

      init('two-and-more-*/t/c/area', mappings);
      $httpBackend.flush();

      expect(Notifier.prototype.warning.called).to.be(true);
      expect($scope.c).to.be.ok();
      expect($scope.c.indexPattern).to.be('two-and-more-*');
      expect($scope.c.index).to.be('m-1');
      expect($scope.c.type).to.be('t');
      expect($scope.c.id).to.be('c');
    });

    it('should handle a wildcard query returning no hits for the sample selection', function () {
      const mappings = [
        {
          pattern: 'empty-*',
          index: 'n-1',
          type: 't'
        },
        {
          pattern: 'empty-*',
          index: 'n-2',
          type: 't'
        }
      ];

      init('empty-*/t/c/area', mappings);
      $httpBackend.flush();

      expect(Notifier.prototype.warning.called).to.be(true);
      expect($scope.c).to.be.ok();
      expect($scope.c.indexPattern).to.be.empty;
      expect($scope.c.index).to.be.empty;
      expect($scope.c.type).to.be.empty;
      expect($scope.c.id).to.be.empty;
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

      init('error-*/t/c/area', mappings);
      $httpBackend.flush();

      expect(Notifier.prototype.error.called).to.be(true);
      expect($scope.c).to.be.ok();
      expect($scope.c.indexPattern).to.be.empty;
      expect($scope.c.index).to.be.empty;
      expect($scope.c.type).to.be.empty;
      expect($scope.c.id).to.be.empty;
    });

  });
});
