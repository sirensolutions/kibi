import * as onPage from 'ui/kibi/utils/on_page';
import MockState from 'fixtures/mock_state';
import Notifier from 'ui/notify/notifier';
import expect from 'expect.js';
import _ from 'lodash';
import sinon from 'auto-release-sinon';
import ngMock from 'ng_mock';
import VirtualIndexPatternProvider from 'ui/kibi/components/commons/virtual_index_pattern';
import DashboardHelperProvider from 'ui/kibi/helpers/dashboard_helper';
import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';

describe('Kibi data table controller', function () {
  let $window;
  let $parentScope;
  let dashboardHelper;
  let VirtualIndexPattern;
  let confirmModalStub;
  let kibiState;
  let courier;

  const init = function ({ props, getAppState, searchSourceMeta, kibiStateMeta }) {
    ngMock.inject(function (Private, _$window_, $rootScope, $controller) {
      const searchSource = Private(StubbedSearchSourceProvider);
      if (searchSourceMeta) {
        _.forOwn(searchSourceMeta, (value, meta) => {
          searchSource[meta] = value;
        });
      }

      VirtualIndexPattern = Private(VirtualIndexPatternProvider);
      dashboardHelper = Private(DashboardHelperProvider);
      dashboardHelper.switchDashboard = sinon.stub();

      kibiState = new MockState({ filters: [] });
      if (kibiStateMeta) {
        _.forOwn(kibiStateMeta, (value, meta) => {
          kibiState[meta] = value;
        });
      }

      $window = _$window_;
      $parentScope = $rootScope;
      $parentScope.searchSource = searchSource;
      _.assign($parentScope, props);

      sinon.stub(onPage, 'onVisualizePage').returns(true);

      courier = {
        fetch: sinon.stub()
      };
      confirmModalStub = sinon.stub();
      $controller('KibiDataTableVisController', {
        confirmModal: confirmModalStub,
        kibiState,
        courier,
        getAppState,
        $scope: $parentScope
      });

      $parentScope.$digest();
    });
  };

  beforeEach(ngMock.module('kibana', function ($provide) {
    $provide.constant('kbnDefaultAppId', '');
    $provide.constant('kibiDefaultDashboardTitle', '');
  }));

  afterEach(function () {
    $parentScope.$destroy();
    Notifier.prototype._notifs.length = 0;
  });

  describe('column alias', function () {
    it('should warn the user if the table has zero result and an alias in the query string is used', function () {
      const props = {
        hits: [],
        vis: {
          params: {
            columns: [ 'label' ],
            columnAliases: [ 'labelAlias' ]
          }
        }
      };
      const getAppState = function () {
        return {
          query: {
            query_string: {
              query: 'labelAlias:value'
            }
          }
        };
      };

      init({ props, getAppState });
      expect(Notifier.prototype._notifs).to.have.length(1);
      expect(Notifier.prototype._notifs[0].type).to.be('warning');
      expect(Notifier.prototype._notifs[0].content)
        .to.contain('You seem to be using an alias: [labelAlias]. The actual field name you probably want is: [label]');
    });
  });

  describe('cell click handlers', function () {
    beforeEach(function () {
      const props = {
        vis: {
          params: {
            clickOptions: [
              {
                columnField: 'bad click option',
                type: 'bad'
              },
              {
                columnField: 'column with link 1',
                type: 'link',
                valueField: 'column with a url',
                uriFormat: '@URL@'
              },
              {
                columnField: 'column with link 2',
                type: 'link',
                valueField: 'column with part of a url',
                uriFormat: 'http://example.com/@URL@'
              },
              {
                columnField: 'column with select 1',
                type: 'select'
              },
              {
                columnField: 'column with select 2',
                type: 'select',
                targetDashboardId: 'mydashboard'
              },
              {
                columnField: 'column with 2 actions',
                type: 'select'
              },
              {
                columnField: 'column with 2 actions',
                type: 'link',
                valueField: 'column with a url',
                uriFormat: '@URL@'
              }
            ]
          }
        }
      };
      const kibiStateMeta = {
        isEntitySelected: sinon.stub(),
        disableSelectedEntity: sinon.stub(),
        setEntityURI: sinon.stub(),
        isSelectedEntityDisabled: sinon.stub(),
        save: sinon.stub()
      };

      init({ props, kibiStateMeta });
    });

    it('should not add a click handler if not defined for the column', function () {
      const clickHandler = $parentScope.cellClickHandlers({}, 'some column');

      expect(clickHandler.clickHandler).to.be(undefined);
      expect(clickHandler.hasSelectedEntity).to.be(false);
      expect(clickHandler.isSelectedEntityDisabled).to.be(false);
    });

    it('should fail if click option is unknown', function () {
      const clickHandler = $parentScope.cellClickHandlers({}, 'bad click option');

      expect(clickHandler.clickHandler).to.be(undefined);
      expect(clickHandler.hasSelectedEntity).to.be(false);
      expect(clickHandler.isSelectedEntityDisabled).to.be(false);

      expect(Notifier.prototype._notifs).to.have.length(1);
      expect(Notifier.prototype._notifs[0].type).to.be('danger');
      expect(Notifier.prototype._notifs[0].content).to.contain('Unknown click action of type bad on the column bad click option');
    });

    it('should allow more than one actions per column', function () {
      const url = 'http://example.com/aaa';
      const row = {
        'column with a url': url,
        _index: 'myindex',
        _type: 'mytype',
        _id: 'myid'
      };

      kibiState.isEntitySelected.returns(false);
      kibiState.isSelectedEntityDisabled.returns(false);

      const clickHandler = $parentScope.cellClickHandlers(row, 'column with 2 actions');

      sinon.assert.calledOnce(kibiState.isEntitySelected);
      expect(clickHandler.hasSelectedEntity).to.be(false);
      expect(clickHandler.isSelectedEntityDisabled).to.be(false);
      expect(typeof clickHandler.clickHandler === 'function').to.be(true);

      const focusStub = sinon.stub();
      $window.open = sinon.stub().returns({
        focus: focusStub
      });

      clickHandler.clickHandler();

      // link
      sinon.assert.calledOnce($window.open);
      sinon.assert.calledWith($window.open, url, '_blank');
      sinon.assert.calledOnce(focusStub);

      // select
      sinon.assert.calledOnce(kibiState.disableSelectedEntity);
      sinon.assert.calledWith(kibiState.disableSelectedEntity, false);
      sinon.assert.calledOnce(kibiState.setEntityURI);
      const entity = {
        index: 'myindex',
        type: 'mytype',
        id: 'myid',
        column: 'column with 2 actions'
      };
      sinon.assert.calledWith(kibiState.setEntityURI, entity);
      sinon.assert.calledOnce(kibiState.save);
      sinon.assert.calledOnce(courier.fetch);
    });

    describe('link click option', function () {
      it('should add a click handler of type link', function () {
        const url = 'http://example.com/aaa';
        const row = {
          'column with a url': url
        };

        const clickHandler = $parentScope.cellClickHandlers(row, 'column with link 1');

        expect(clickHandler.hasSelectedEntity).to.be(false);
        expect(clickHandler.isSelectedEntityDisabled).to.be(false);
        expect(typeof clickHandler.clickHandler === 'function').to.be(true);

        const focusStub = sinon.stub();
        $window.open = sinon.stub().returns({
          focus: focusStub
        });
        clickHandler.clickHandler();
        sinon.assert.calledOnce($window.open);
        sinon.assert.calledWith($window.open, url, '_blank');
        sinon.assert.calledOnce(focusStub);
      });

      it('should handle custom URL format', function () {
        const value = 'one / two';
        const row = {
          'column with part of a url': value
        };

        const clickHandler = $parentScope.cellClickHandlers(row, 'column with link 2');

        expect(clickHandler.hasSelectedEntity).to.be(false);
        expect(clickHandler.isSelectedEntityDisabled).to.be(false);
        expect(typeof clickHandler.clickHandler === 'function').to.be(true);

        const focusStub = sinon.stub();
        $window.open = sinon.stub().returns({
          focus: focusStub
        });
        clickHandler.clickHandler();
        sinon.assert.calledOnce($window.open);
        sinon.assert.calledWith($window.open, `http://example.com/${encodeURIComponent(value)}`, '_blank');
        sinon.assert.calledOnce(focusStub);
      });

      it('should handle array values', function () {
        const valueField = 'column with a url';
        const urlAAA = 'http://example.com/aaa';
        const urlBBB = 'http://example.com/bbb';
        const row = {
          [valueField]: [ urlBBB, urlAAA ]
        };

        const clickHandler = $parentScope.cellClickHandlers(row, 'column with link 1');

        expect(clickHandler.hasSelectedEntity).to.be(false);
        expect(clickHandler.isSelectedEntityDisabled).to.be(false);
        expect(typeof clickHandler.clickHandler === 'function').to.be(true);

        const focusStub = sinon.stub();
        $window.open = sinon.stub().returns({
          focus: focusStub
        });
        clickHandler.clickHandler();
        sinon.assert.calledOnce($window.open);
        sinon.assert.calledWith($window.open, urlBBB, '_blank');
        sinon.assert.calledOnce(focusStub);

        expect(Notifier.prototype._notifs).to.have.length(1);
        expect(Notifier.prototype._notifs[0].type).to.be('warning');
        expect(Notifier.prototype._notifs[0].content)
          .to.contain(`Field [${valueField}] used in an click handler contains more than one value. The first value will be used.`);
      });
    });

    describe('select click option', function () {
      it('should select the entity', function () {
        const row = {
          _index: 'myindex',
          _type: 'mytype',
          _id: 'myid'
        };

        kibiState.isEntitySelected.returns(false);
        kibiState.isSelectedEntityDisabled.returns(false);

        const clickHandler = $parentScope.cellClickHandlers(row, 'column with select 1');

        sinon.assert.calledOnce(kibiState.isEntitySelected);
        expect(clickHandler.hasSelectedEntity).to.be(false);
        expect(clickHandler.isSelectedEntityDisabled).to.be(false);
        expect(typeof clickHandler.clickHandler === 'function').to.be(true);

        clickHandler.clickHandler();
        sinon.assert.calledOnce(kibiState.disableSelectedEntity);
        sinon.assert.calledWith(kibiState.disableSelectedEntity, false);
        sinon.assert.calledOnce(kibiState.setEntityURI);
        const entity = {
          index: 'myindex',
          type: 'mytype',
          id: 'myid',
          column: 'column with select 1'
        };
        sinon.assert.calledWith(kibiState.setEntityURI, entity);
        sinon.assert.calledOnce(kibiState.save);
        sinon.assert.calledOnce(courier.fetch);
      });

      it('should switch dashboard when selecting the entity', function () {
        const row = {
          _index: 'myindex',
          _type: 'mytype',
          _id: 'myid'
        };

        kibiState.isEntitySelected.returns(false);
        kibiState.isSelectedEntityDisabled.returns(false);

        const clickHandler = $parentScope.cellClickHandlers(row, 'column with select 2');

        sinon.assert.calledOnce(kibiState.isEntitySelected);
        expect(clickHandler.hasSelectedEntity).to.be(false);
        expect(clickHandler.isSelectedEntityDisabled).to.be(false);
        expect(typeof clickHandler.clickHandler === 'function').to.be(true);

        clickHandler.clickHandler();
        sinon.assert.calledOnce(kibiState.disableSelectedEntity);
        sinon.assert.calledWith(kibiState.disableSelectedEntity, false);
        sinon.assert.calledOnce(kibiState.setEntityURI);
        const entity = {
          index: 'myindex',
          type: 'mytype',
          id: 'myid',
          column: 'column with select 2'
        };
        sinon.assert.calledWith(kibiState.setEntityURI, entity);
        sinon.assert.calledOnce(kibiState.setEntityURI);
        sinon.assert.calledOnce(dashboardHelper.switchDashboard);
        sinon.assert.calledWith(dashboardHelper.switchDashboard, 'mydashboard');
      });

      describe('selected entity flag', function () {
        it('entity is selected and disabled', function () {
          const row = {
            _index: 'myindex',
            _type: 'mytype',
            _id: 'myid'
          };

          kibiState.isEntitySelected.returns(true);
          kibiState.isSelectedEntityDisabled.returns(true);

          const clickHandler = $parentScope.cellClickHandlers(row, 'column with select 1');

          sinon.assert.calledOnce(kibiState.isEntitySelected);
          expect(clickHandler.hasSelectedEntity).to.be(true);
          expect(clickHandler.isSelectedEntityDisabled).to.be(true);
          expect(typeof clickHandler.clickHandler === 'function').to.be(true);
        });

        it('entity is selected and enabled', function () {
          const row = {
            _index: 'myindex',
            _type: 'mytype',
            _id: 'myid'
          };

          kibiState.isEntitySelected.returns(true);
          kibiState.isSelectedEntityDisabled.returns(false);

          const clickHandler = $parentScope.cellClickHandlers(row, 'column with select 1');

          sinon.assert.calledOnce(kibiState.isEntitySelected);
          expect(clickHandler.hasSelectedEntity).to.be(true);
          expect(clickHandler.isSelectedEntityDisabled).to.be(false);
          expect(typeof clickHandler.clickHandler === 'function').to.be(true);
        });

        // sanity check
        it('entity is not selected and but disabled', function () {
          const row = {
            _index: 'myindex',
            _type: 'mytype',
            _id: 'myid'
          };

          kibiState.isEntitySelected.returns(false);
          kibiState.isSelectedEntityDisabled.returns(true);

          const clickHandler = $parentScope.cellClickHandlers(row, 'column with select 1');

          sinon.assert.calledOnce(kibiState.isEntitySelected);
          expect(clickHandler.hasSelectedEntity).to.be(false);
          expect(clickHandler.isSelectedEntityDisabled).to.be(false);
          expect(typeof clickHandler.clickHandler === 'function').to.be(true);
        });
      });
    });
  });

  describe('relational column', function () {
    const props = {
      vis: {
        params: {
          queryFieldName: 'field1',
          joinElasticsearchField: 'machine.os',
          queryDefinitions: [
            {
              queryId: '123'
            }
          ]
        }
      }
    };
    const searchSourceMeta = {
      index: sinon.stub(),
      inject: sinon.stub()
    };

    it('should add a relational column', function () {
      const entity = {
        index: 'myindex',
        type: 'mytype',
        id: 'myid',
        column: 'mycolumn'
      };
      const kibiStateMeta = {
        isSelectedEntityDisabled: _.constant(false),
        getEntityURI: _.constant(entity)
      };

      init({ props, kibiStateMeta, searchSourceMeta });

      sinon.assert.calledWith(searchSourceMeta.index, sinon.match.instanceOf(VirtualIndexPattern));
      sinon.assert.calledWith(searchSourceMeta.inject, [
        {
          queryDefs: props.vis.params.queryDefinitions,
          sourcePath: [ 'machine', 'os' ],
          fieldName: 'field1',
          entityURI: entity
        }
      ]);
    });

    it('should not add the selected entity if disabled', function () {
      const kibiStateMeta = {
        isSelectedEntityDisabled: _.constant(true)
      };

      init({ props, kibiStateMeta, searchSourceMeta });

      sinon.assert.calledWith(searchSourceMeta.index, sinon.match.instanceOf(VirtualIndexPattern));
      sinon.assert.calledWith(searchSourceMeta.inject, [
        {
          queryDefs: props.vis.params.queryDefinitions,
          sourcePath: [ 'machine', 'os' ],
          fieldName: 'field1'
        }
      ]);
    });
  });

  describe('column management', function () {
    it('should add a column', function () {
      const props = {
        vis: {
          params: {
            columns: [ 'aaa' ],
            columnAliases: [ 'AAA' ]
          }
        }
      };

      init({ props });

      $parentScope.onAddColumn('bbb');
      expect($parentScope.vis.params.columns).to.have.length(2);
      expect($parentScope.vis.params.columns[1]).to.be('bbb');
      expect($parentScope.vis.params.columnAliases).to.have.length(2);
      expect($parentScope.vis.params.columnAliases[1]).to.be('bbb');
    });

    it('should move a column', function () {
      const props = {
        vis: {
          params: {
            columns: [ 'aaa', 'bbb', 'ccc' ],
            columnAliases: [ 'AAA', 'BBB', 'CCC' ]
          }
        }
      };

      init({ props });

      $parentScope.onMoveColumn('bbb', 2);
      expect($parentScope.vis.params.columns).to.have.length(3);
      expect($parentScope.vis.params.columns).to.eql([ 'aaa', 'ccc', 'bbb' ]);
      expect($parentScope.vis.params.columnAliases).to.have.length(3);
      expect($parentScope.vis.params.columnAliases).to.eql([ 'AAA', 'CCC', 'BBB' ]);
    });

    describe('remove a column', function () {
      it('should remove a column', function () {
        const props = {
          vis: {
            params: {
              columns: [ 'aaa', 'bbb', 'ccc' ],
              columnAliases: [ 'AAA', 'BBB', 'CCC' ]
            }
          }
        };

        init({ props });

        $parentScope.onRemoveColumn('bbb');
        expect($parentScope.vis.params.columns).to.have.length(2);
        expect($parentScope.vis.params.columns).to.eql([ 'aaa', 'ccc' ]);
        expect($parentScope.vis.params.columnAliases).to.have.length(2);
        expect($parentScope.vis.params.columnAliases).to.eql([ 'AAA', 'CCC' ]);
      });

      it('should prompt if the column is a relational column', function () {
        const props = {
          vis: {
            params: {
              columns: [ 'aaa', 'bbb', 'ccc' ],
              columnAliases: [ 'aaa', 'BBB', 'CCC' ],
              enableQueryFields: true,
              queryFieldName: 'aaa',
              joinElasticsearchField: 'machine.os',
              queryDefinitions: [
                {
                  queryId: '123'
                }
              ]
            }
          }
        };
        const searchSourceMeta = {
          index: _.noop,
          inject: _.noop
        };
        const kibiStateMeta = {
          isSelectedEntityDisabled: _.constant(false),
          getEntityURI: _.noop
        };

        init({ props, kibiStateMeta, searchSourceMeta });

        $parentScope.onRemoveColumn('aaa');
        sinon.assert.calledOnce(confirmModalStub);
        sinon.assert.calledWith(confirmModalStub, 'Are you sure you want to remove the relational column "aaa" ?');
      });

      it('should prompt if the column has click options', function () {
        const props = {
          vis: {
            params: {
              columns: [ 'aaa', 'bbb', 'ccc' ],
              columnAliases: [ 'aaa', 'BBB', 'CCC' ],
              clickOptions: [
                {
                  columnField: 'aaa',
                  type: 'link'
                },
                {
                  columnField: 'aaa',
                  type: 'select'
                }
              ]
            }
          }
        };

        init({ props });

        $parentScope.onRemoveColumn('aaa');
        sinon.assert.calledOnce(confirmModalStub);
        sinon.assert.calledWith(confirmModalStub, 'There are 2 click actions configured with the aaa column.');
      });
    });
  });
});
