import sinon from 'sinon';
import ngMock from 'ng_mock';
import expect from 'expect.js';
import * as onPage from 'ui/kibi/utils/on_page';
import { MockState } from 'fixtures/mock_state';
import _ from 'lodash';
import '../kibi_entity_clipboard';
import noDigestPromises from 'test_utils/no_digest_promises';

describe('Kibi Components', function () {
  describe('Entity Clipboard', function () {
    let $rootScope;
    let globalState;
    let appState;
    let kibiState;

    function init({ entityDisabled = false, selectedEntity, currentDashboardId, hit } = {}) {
      ngMock.module(
        'kibana',
        'kibana/courier',
        'kibana/global_state',
        function ($provide) {
          $provide.constant('kbnDefaultAppId', '');
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

      ngMock.inject(function (Promise, config, _kibiState_, _$rootScope_, $compile, es) {
        sinon.stub(es, 'search').returns(Promise.resolve({
          hits: {
            total: 1,
            hits: [ hit ]
          }
        }));
        config.set('metaFields', [ '_type' ]); // reset the metaFields value
        sinon.stub(onPage, 'onDashboardPage').returns(true);

        kibiState = _kibiState_;
        kibiState.setEntityURI(selectedEntity);
        kibiState.disableSelectedEntity(entityDisabled);
        sinon.stub(kibiState, '_getCurrentDashboardId').returns(currentDashboardId);

        $rootScope = _$rootScope_;
        $compile('<kibi-entity-clipboard></kibi-entity-clipboard>')($rootScope);
      });
    }

    noDigestPromises.activateForSuite();

    it('should listen to kibiState changes', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'column'
        },
        hit: {
          _source: {
            column: 'label'
          }
        }
      };

      init(args);
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/column');

      expect(kibiState.listenerCount()).to.be(1);

      kibiState.setEntityURI({ index: 'a', type: 'b', id: 'c' });
      kibiState.listeners('save_with_changes')[0]([ kibiState._properties.selected_entity ]);
      expect($rootScope.entityURI).to.be('a/b/c/');

      kibiState.disableSelectedEntity(true);
      kibiState.listeners('save_with_changes')[0]([ kibiState._properties.selected_entity_disabled ]);
      expect($rootScope.disabled).to.be(true);
    });

    it('should select the document', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'column'
        },
        hit: {
          _source: {
            column: 'label'
          }
        }
      };

      init(args);
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/column');
    });

    it('selected document with "nested" column', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'a.b.c with spaces'
        },
        hit: {
          _source: {
            a: {
              b: {
                'c with spaces': 'correct label'
              }
            }
          }
        }
      };

      init(args);

      return $rootScope.updateSelectedEntity()
        .then(() => {
          expect($rootScope.label).to.equal('correct label');
          expect($rootScope.disabled).to.be(false);
          expect($rootScope.entityURI).to.be('index/type/id/a.b.c with spaces');
        });
    });

    it('should truncate long document label', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'a.b.c with spaces'
        },
        hit: {
          _source: {
            a: {
              b: {
                'c with spaces': 'Previous  |  Next Image 1 of 5 Beam me up, Scotty... Videoconferencing has'
              }
            }
          }
        }
      };

      init(args);

      return $rootScope.updateSelectedEntity()
        .then(() => {
          expect($rootScope.label).to.equal('Previous  |  Next Image 1 of 5 Beam me up, Scotty......');
        });
    });

    it('selected document with label from meta field column', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: '_type'
        },
        hit: {
          _type: 'TYPE'
        }
      };

      init(args);

      return $rootScope.updateSelectedEntity()
        .then(() => {
          expect($rootScope.label).to.equal('TYPE');
          expect($rootScope.disabled).to.be(false);
          expect($rootScope.entityURI).to.be('index/type/id/_type');
        });
    });

    it('selected document with "nested" column with an array', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'a.b.c with spaces'
        },
        hit: {
          _source: {
            a: {
              b: {
                'c with spaces': [ 'aaa' ]
              }
            }
          }
        }
      };

      init(args);

      return $rootScope.updateSelectedEntity()
        .then(() => {
          expect($rootScope.label).to.eql(JSON.stringify([ 'aaa' ]));
          expect($rootScope.disabled).to.be(false);
          expect($rootScope.entityURI).to.be('index/type/id/a.b.c with spaces');
        });
    });

    it('selected document with "nested" column with an object', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'a.b.c with spaces'
        },
        hit: {
          _source: {
            a: {
              b: {
                'c with spaces': { a: 'b' }
              }
            }
          }
        }
      };

      init(args);

      return $rootScope.updateSelectedEntity()
        .then(() => {
          expect($rootScope.label).to.eql(JSON.stringify({ a: 'b' }));
          expect($rootScope.disabled).to.be(false);
          expect($rootScope.entityURI).to.be('index/type/id/a.b.c with spaces');
        });
    });

    it('selected document is disabled', function () {
      const args = {
        entityDisabled: true,
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'column'
        },
        hit: {
          _source: {
            column: 'correct label'
          }
        }
      };

      init(args);

      return $rootScope.updateSelectedEntity()
        .then(() => {
          expect($rootScope.label).to.equal('correct label');
          expect($rootScope.disabled).to.be(true);
          expect($rootScope.entityURI).to.be('index/type/id/column');
        });
    });

    it('an entity missing column sets the label to the document URI', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: ''
        }
      };

      init(args);

      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be('index/type/id/');
      expect($rootScope.label).to.be('index/type/id/');
    });

    it('a document missing the URI', function () {
      init();
      expect($rootScope.disabled).to.be(false);
      expect($rootScope.entityURI).to.be(undefined);
      expect($rootScope.label).to.be(undefined);
    });

    it('should remove the document', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'column/label'
        }
      };

      init(args);

      $rootScope.removeAllEntities();
      expect($rootScope.disabled).to.be(undefined);
      expect($rootScope.entityURI).to.be(undefined);
      expect($rootScope.label).to.be(undefined);
      expect(kibiState.isSelectedEntityDisabled()).to.be(false);
      expect(kibiState.getEntityURI()).to.not.be.ok();
    });

    it('should remove the document and associated filters', function () {
      const args = {
        selectedEntity: {
          index: 'index',
          type: 'type',
          id: 'id',
          column: 'column/label'
        },
        currentDashboardId: 'dashboard2'
      };

      init(args);

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
      init();

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
