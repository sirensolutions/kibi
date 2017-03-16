import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import * as onPage from 'ui/kibi/utils/on_page';
import MockState from 'fixtures/mock_state';
import _ from 'lodash';
import '../kibi_entity_clipboard';

describe('Kibi Components', function () {
  describe('Entity Clipboard', function () {
    let $rootScope;
    let globalState;
    let appState;
    let kibiState;
    let $httpBackend;

    function init(entityDisabled, selectedEntity, currentDashboardId) {
      ngMock.module(
        'kibana',
        'kibana/courier',
        'kibana/global_state',
        function ($provide) {
          $provide.constant('kbnDefaultAppId', '');
          $provide.constant('kibiDefaultDashboardTitle', '');
          $provide.service('$route', function () {
            return {
              reload: _.noop
            };
          });

          appState = new MockState({ filters: [] });
          $provide.service('getAppState', function () {
            return function () { return appState; };
          });

          globalState = new MockState();
          $provide.service('globalState', function () {
            return globalState;
          });
        }
        );

      ngMock.inject(function (config, _kibiState_, _$rootScope_, $compile, $injector) {
        config.set('metaFields', [ '_type' ]); // reset the metaFields value
        sinon.stub(onPage, 'onDashboardPage').returns(true);

        kibiState = _kibiState_;
        kibiState.setEntityURI(selectedEntity);
        kibiState.disableSelectedEntity(entityDisabled);

        $rootScope = _$rootScope_;
        $httpBackend = $injector.get('$httpBackend');
        $compile('<kibi-entity-clipboard></kibi-entity-clipboard>')($rootScope);
        sinon.stub(kibiState, '_getCurrentDashboardId').returns(currentDashboardId);
      });
    }

    it('selected document', function () {
      init(false, 'index/type/id/column');
      $httpBackend.whenGET('/elasticsearch/index/type/id').respond(200, {
        _source: {
          column: 'label'
        }
      });
      $httpBackend.flush();
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/column');
    });

    it('selected document with "nested" column', function (done) {
      init(false, 'index/type/id/a.b.c with spaces');

      $httpBackend.whenGET('/elasticsearch/index/type/id').respond(200, {
        _source: {
          a: {
            b: {
              'c with spaces': 'correct label'
            }
          }
        }
      });

      $rootScope.$watch('label', function (label) {
        if (label) {
          expect(label).to.equal('correct label');
          done();
        }
      });

      $httpBackend.flush();
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/a.b.c with spaces');
      $rootScope.$apply();
    });

    it('should truncate long document label', function (done) {
      init(false, 'index/type/id/a.b.c with spaces');

      $httpBackend.whenGET('/elasticsearch/index/type/id').respond(200, {
        _source: {
          a: {
            b: {
              'c with spaces': 'Previous  |  Next Image 1 of 5 Beam me up, Scotty... Videoconferencing has'
            }
          }
        }
      });

      $rootScope.$watch('label', function (label) {
        if (label) {
          expect(label).to.equal('Previous  |  Next Image 1 of 5 Beam me up, Scotty......');
          done();
        }
      });

      $httpBackend.flush();
      $rootScope.$apply();
    });

    it('selected document with label from meta field column', function (done) {
      init(false, 'index/type/id/_type');

      $httpBackend.whenGET('/elasticsearch/index/type/id').respond(200, {
        _type: 'TYPE'
      });

      $rootScope.$watch('label', function (label) {
        if (label) {
          expect(label).to.equal('TYPE');
          done();
        }
      });

      $httpBackend.flush();
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/_type');
      $rootScope.$apply();
    });

    it('selected document with "nested" column with an array', function (done) {
      init(false, 'index/type/id/a.b.c with spaces');

      $httpBackend.whenGET('/elasticsearch/index/type/id').respond(200, {
        _source: {
          a: {
            b: {
              'c with spaces': [ 'aaa' ]
            }
          }
        }
      });

      $rootScope.$watch('label', function (label) {
        if (label) {
          expect(label).to.eql(JSON.stringify([ 'aaa' ]));
          done();
        }
      });

      $httpBackend.flush();
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/a.b.c with spaces');
      $rootScope.$apply();
    });

    it('selected document with "nested" column with an object', function (done) {
      init(false, 'index/type/id/a.b.c with spaces');

      $httpBackend.whenGET('/elasticsearch/index/type/id').respond(200, {
        _source: {
          a: {
            b: {
              'c with spaces': { a: 'b' }
            }
          }
        }
      });

      $rootScope.$watch('label', function (label) {
        if (label) {
          expect(label).to.eql(JSON.stringify({ a: 'b' }));
          done();
        }
      });

      $httpBackend.flush();
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/a.b.c with spaces');
      $rootScope.$apply();
    });


    it('selected document but disabled', function (done) {
      init(true, 'index/type/id/column');
      $httpBackend.whenGET('/elasticsearch/index/type/id').respond(200, {
        _source: {
          column: 'correct label'
        }
      });

      $rootScope.$watch('label', function (label) {
        if (label) {
          expect(label).to.equal('correct label');
          done();
        }
      });

      $httpBackend.flush();
      expect($rootScope.disabled).to.be(true);
      expect($rootScope.entityURI).to.be('index/type/id/column');
      $rootScope.$apply();
    });

    it('an entity missing column does not set the label', function () {
      init(false, 'index/type/id/');
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/');
      expect($rootScope.label).to.not.be.ok();
    });

    it('an document missing the URI', function () {
      init(false);
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be(undefined);
      expect($rootScope.label).to.be(undefined);
    });

    it('should remove the document', function () {
      init(false, 'index/type/id/column/label');
      $rootScope.removeAllEntities();
      expect($rootScope.disabled).to.be(undefined);
      expect($rootScope.entityURI).to.be(undefined);
      expect($rootScope.label).to.be(undefined);
      expect(kibiState.isSelectedEntityDisabled()).to.be(false);
      expect(kibiState.getEntityURI()).to.not.be.ok();
    });

    it('should remove the document and associated filters', function () {
      init(false, 'index/type/id/column/label', 'dashboard2');

      globalState.filters = [
        {
          filter: 4,
          meta: {
            dependsOnSelectedEntities: true
          }
        }
      ];
      appState.filters = [
        {
          filter: 2,
          meta: {}
        },
        {
          filter: 3,
          meta: {
            dependsOnSelectedEntities: true
          }
        }
      ];
      kibiState._setDashboardProperty('dashboard1', kibiState._properties.filters, [
        {
          filter: 1,
          meta: {
            dependsOnSelectedEntities: true
          }
        }
      ]);
      kibiState._setDashboardProperty('dashboard2', kibiState._properties.filters, [
        {
          filter: 2,
          meta: {}
        },
        {
          filter: 3,
          meta: {
            dependsOnSelectedEntities: true
          }
        }
      ]);

      $rootScope.removeAllEntities();

      // appstate filters
      expect(appState.filters).to.eql([ { filter: 2, meta: {} } ]);
      // kibistate filters
      expect(kibiState._getDashboardProperty('dashboard1', kibiState._properties.filters)).to.have.length(0);
      expect(kibiState._getDashboardProperty('dashboard2', kibiState._properties.filters)).to.eql([ { filter: 2, meta: {} } ]);
      // pinned filters
      expect(globalState.filters).to.have.length(0);
    });

    it('should toggle the selected document', function () {
      init(false);
      expect($rootScope.disabled).to.be(false);
      expect(kibiState.isSelectedEntityDisabled()).to.be(false);
      $rootScope.toggleClipboard();
      expect($rootScope.disabled).to.be(true);
      expect(kibiState.isSelectedEntityDisabled()).to.be(true);
      $rootScope.toggleClipboard();
      expect($rootScope.disabled).to.be(false);
      expect(kibiState.isSelectedEntityDisabled()).to.be(false);
    });

  });
});
