import noDigestPromises from 'test_utils/no_digest_promises';
import { KibiSequentialJoinVisHelperFactory } from 'ui/kibi/helpers/kibi_sequential_join_vis_helper';
import { MockState } from 'fixtures/mock_state';
import { mockSavedObjects } from 'fixtures/kibi/mock_saved_objects';
import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed
import expect from 'expect.js';
import ngMock from 'ng_mock';
import Promise from 'bluebird';
import { parseWithPrecision } from 'ui/kibi/utils/date_math_precision';

let sequentialJoinVisHelper;
let kibiState;
let appState;
let $rootScope;
let saveAppStateStub;
let config;

const defaultTimeStart = '2006-09-01T12:00:00.000Z';
const defaultTimeEnd = '2009-09-01T12:00:00.000Z';

function init({
    currentDashboardId = 'dashboard 1',
    indexPatterns = [],
    savedSearches = [],
    savedDashboards = [ { id: currentDashboardId, title: currentDashboardId } ],
    relations = {
      relationsIndices: [],
      relationsDashboards: []
    }
  } = {}) {
  ngMock.module('kibana', 'kibana/courier', 'kibana/global_state', ($provide) => {
    $provide.constant('kbnDefaultAppId', '');

    appState = new MockState({ filters: [] });
    $provide.service('getAppState', function () {
      return function () { return appState; };
    });

    $provide.service('globalState', function () {
      return new MockState({ filters: [] });
    });
  });

  ngMock.module('kibana/index_patterns', function ($provide) {
    $provide.service('indexPatterns', (Promise, Private) => mockSavedObjects(Promise, Private)('indexPatterns', indexPatterns));
  });

  ngMock.module('discover/saved_searches', function ($provide) {
    $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', savedSearches));
  });

  ngMock.module('app/dashboard', function ($provide) {
    $provide.service('savedDashboards', (Promise, Private) => mockSavedObjects(Promise, Private)('savedDashboards', savedDashboards));
  });

  ngMock.inject(function (_config_, _$rootScope_, timefilter, _kibiState_, Private, Promise) {
    config = _config_;
    $rootScope = _$rootScope_;
    kibiState = _kibiState_;
    sequentialJoinVisHelper = Private(KibiSequentialJoinVisHelperFactory);
    sinon.stub(kibiState, '_getCurrentDashboardId').returns(currentDashboardId);
    sinon.stub(kibiState, 'isSirenJoinPluginInstalled').returns(true);
    saveAppStateStub = sinon.stub(kibiState, 'saveAppState').returns(Promise.resolve());

    const defaultTime = {
      mode: 'absolute',
      from: defaultTimeStart,
      to: defaultTimeEnd
    };
    config.set('timepicker:timeDefaults', defaultTime);
    config.set('kibi:relations', relations);
    timefilter.time = defaultTime;
  });
}

describe('Kibi Components', function () {
  describe('sequentialJoinVisHelper', function () {

    noDigestPromises.activateForSuite();

    it('should not do anything when a button is clicked in the config window', function () {
      init({
        currentDashboardId: ''
      });

      const index = 'index1';
      const buttonDefs = [
        {
          indexRelationId: 'index1//f1/index2//f2',
          label: 'button 1',
          getSourceCount: sinon.stub().returns(Promise.resolve(123))
        }
      ];
      const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);

      expect(buttons.length).to.equal(1);

      const button = buttons[0];
      expect(button.label).to.equal('button 1');
      expect(button.sourceIndexPatternId).to.equal('index1');
      expect(typeof button.click).to.equal('function');

      return button.click()
      .then(() => {
        sinon.assert.notCalled(saveAppStateStub);
      });
    });

    describe('constructButtonArray', function () {
      describe('buttons configured with sourceDashboard targetDashboard and indexRelationId', function () {
        it('should correctly assign source and target index, type and field', function () {
          init({
            relations: {
              relationsIndices: [
                {
                  id: 'ia//fa/ib//fb'
                }
              ],
              relationsDashboards: []
            }
          });
          const buttonDefs = [
            {
              label: 'from A to B',
              sourceDashboardId: 'dashboardA',
              redirectToDashboard: 'dashboardB',
              indexRelationId: 'ia//fa/ib//fb'
            }
          ];

          const index = 'ia';

          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          expect(buttons[0].sourceIndexPatternId).to.equal('ia');
          expect(buttons[0].sourceIndexPatternType).to.equal('');
          expect(buttons[0].sourceField).to.equal('fa');
          expect(buttons[0].targetIndexPatternId).to.equal('ib');
          expect(buttons[0].targetIndexPatternType).to.equal('');
          expect(buttons[0].targetField).to.equal('fb');
        });
      });

      describe('buttons configured with targetDashboard and indexRelationId', function () {
        it('should correctly filter out if currentDashboardIndex is neither in source nor in target for the button relation', function () {
          init({
            relations: {
              relationsIndices: [
                {
                  id: 'ic//fc/id//fd'
                }
              ],
              relationsDashboards: []
            }
          });
          const buttonDefs = [
            {
              label: 'from C to D',
              targetDashboardId: 'dashboardC',
              indexRelationId: 'ic//fc/id//fd'
            }
          ];
          const dashboardIdIndexPair = new Map();
          dashboardIdIndexPair.set('dashboardA', 'ia');
          dashboardIdIndexPair.set('dashboardB', 'ib');

          const index = 'ia';
          const currentDashboardId = 'dashboardA';

          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index, currentDashboardId, dashboardIdIndexPair);
          expect(buttons.length).to.equal(0);
        });

        it('should correctly filter out it if currentDashboardIndex same as relation source index' +
          'but index of targetDashboard different than relation target index', function () {
          init({
            relations: {
              relationsIndices: [
                {
                  id: 'ia//fa/ib//fb'
                }
              ],
              relationsDashboards: []
            }
          });
          const buttonDefs = [
            {
              label: 'from B to A',
              targetDashboardId: 'dashboardA',
              indexRelationId: 'ia//fa/ib//fb'
            }
          ];
          const dashboardIdIndexPair = new Map();
          dashboardIdIndexPair.set('dashboardA', 'ia');
          dashboardIdIndexPair.set('dashboardB', 'ib');
          dashboardIdIndexPair.set('dashboardC', 'ia');

          const index = 'ia';
          const currentDashboardId = 'dashboardC';

          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index, currentDashboardId, dashboardIdIndexPair);
          expect(buttons.length).to.equal(0);
        });

        it('should correctly filter it out if currentDashboardIndex same as relation target index' +
          'but index of targetDashboard different than relation source index', function () {
          init({
            relations: {
              relationsIndices: [
                {
                  id: 'ib//fb/ia//fa'
                }
              ],
              relationsDashboards: []
            }
          });
          const buttonDefs = [
            {
              label: 'from B to A',
              targetDashboardId: 'dashboardA',
              indexRelationId: 'ib//fb/ia//fa'
            }
          ];
          const dashboardIdIndexPair = new Map();
          dashboardIdIndexPair.set('dashboardA', 'ia');
          dashboardIdIndexPair.set('dashboardB', 'ib');
          dashboardIdIndexPair.set('dashboardC', 'ia');

          const index = 'ia';
          const currentDashboardId = 'dashboardC';

          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index, currentDashboardId, dashboardIdIndexPair);
          expect(buttons.length).to.equal(0);
        });
      });

      it('empty buttonsDef array', function () {
        const buttonDefs = [];
        const expected = [];

        init();
        expect(sequentialJoinVisHelper.constructButtonsArray(buttonDefs)).to.eql(expected);
      });

      describe('custom filter label', function () {
        let index;
        let buttonDefs;

        beforeEach(() => init());
        beforeEach(function () {
          index = 'index1';
          buttonDefs = [
            {
              indexRelationId: 'index1//f1/index2//f2',
              label: 'button 1',
              getSourceCount: sinon.stub().returns(Promise.resolve(123))
            }
          ];
        });

        it('should set the default filter label if no custom is set', function () {
          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          const button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          return button.click().then(() => {
            sinon.assert.calledOnce(buttonDefs[0].getSourceCount);
            expect(button.joinSeqFilter.meta.alias).to.eql('... related to (123) from dashboard 1');
          });
        });

        it('should replace both $COUNT and $DASHBOARD occurrences', function () {
          buttonDefs[0].filterLabel = 'My custom label with placeholders $COUNT $DASHBOARD';
          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          const button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };


          return button.click().then(() => {
            sinon.assert.calledOnce(buttonDefs[0].getSourceCount);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label with placeholders 123 dashboard 1');
          });
        });

        it('should replace $DASHBOARD', function () {
          buttonDefs[0].filterLabel = 'My custom label $DASHBOARD';
          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          const button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          return button.click().then(() => {
            sinon.assert.notCalled(buttonDefs[0].getSourceCount);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label dashboard 1');
          });
        });

        it('should replace $COUNT', function () {
          buttonDefs[0].filterLabel = 'My custom label $COUNT';
          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          const button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          return button.click().then(() => {
            sinon.assert.calledOnce(buttonDefs[0].getSourceCount);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label 123');
          });
        });

        it('should replace nothing', function () {
          buttonDefs[0].filterLabel = 'My custom label';
          const buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          const button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          return button.click().then(() => {
            sinon.assert.notCalled(buttonDefs[0].getSourceCount);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label');
          });
        });
      });
    });

    describe('time-based indices', function () {
      let indexPatterns;
      let savedDashboards;

      beforeEach(function () {
        indexPatterns = [
          {
            id: 'ia-*',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'string'
              }
            ]
          }
        ];
        savedDashboards = [
          {
            id: 'dashboardA',
            title: 'dashboardA'
          }
        ];
      });

      it('should expand the time-based index pattern', function () {
        const currentDashboardId = 'dashboardA';
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia-*',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };

        init({ currentDashboardId, indexPatterns, savedDashboards });

        const timeBasedIndicesStub = sinon.stub(kibiState, 'timeBasedIndices');
        timeBasedIndicesStub.withArgs('ia-*').returns([ 'ia-1', 'ia-2' ]);
        timeBasedIndicesStub.withArgs('ib').returns([ 'ib' ]);

        return sequentialJoinVisHelper.getJoinSequenceFilter(currentDashboardId, button).then((rel) => {
          sinon.assert.called(timeBasedIndicesStub);
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].indices).to.eql([ 'ia-1', 'ia-2' ]);
          expect(rel.join_sequence[0].relation[1].indices).to.eql([ button.targetIndexPatternId ]);
        });
      });
    });

    describe('getJoinSequenceFilter', function () {
      let indexPatterns;
      let savedDashboards;
      let savedSearches;

      beforeEach(function () {
        indexPatterns = [
          {
            id: 'ia',
            timeField: 'date',
            fields: [
              {
                name: 'date',
                type: 'string'
              }
            ]
          }
        ];
        savedDashboards = [
          {
            id: 'dashboardA',
            title: 'dashboardA',
            savedSearchId: 'searchA'
          }
        ];
        savedSearches = [
          {
            id: 'searchA',
            kibanaSavedObjectMeta: {
              searchSourceJSON: JSON.stringify({
                index: 'ia',
                query: { match: { a: 123 } },
                filter: []
              })
            }
          }
        ];
      });

      it('should build the join_sequence', function () {
        const currentDashboardId = 'dashboardA';
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };

        init({ currentDashboardId, indexPatterns, savedDashboards, savedSearches });

        const timeBasedIndicesStub = sinon.stub(kibiState, 'timeBasedIndices');
        timeBasedIndicesStub.withArgs('ia').returns([ 'ia' ]);
        timeBasedIndicesStub.withArgs('ib').returns([ 'ib' ]);

        appState.filters = [
          {
            term: {
              field: 'aaa'
            },
            meta: {
              disabled: false
            }
          }
        ];

        return sequentialJoinVisHelper.getJoinSequenceFilter(currentDashboardId, button).then((rel) => {
          sinon.assert.called(timeBasedIndicesStub);
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.join_sequence[0].relation[0].path).to.be(button.sourceField);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must).to.have.length(4);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[0]).to.be.eql({
            term: {
              field: 'aaa'
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[1]).to.be.eql({
            query_string: {
              query: '*',
              analyze_wildcard: true
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[2]).to.be.eql({ match: { a: 123 } });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[3]).to.be.eql({
            range: {
              date: {
                gte: parseWithPrecision(defaultTimeStart, false).valueOf(),
                lte: parseWithPrecision(defaultTimeEnd, true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('long');
          expect(rel.join_sequence[0].relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.join_sequence[0].relation[1].path).to.be(button.targetField);
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('long');
        });
      });

      it('should build the join_sequence with the appropriate index types', function () {
        const currentDashboardId = 'dashboardA';
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          sourceIndexPatternType: 'ta',
          targetField: 'fb',
          targetIndexPatternId: 'ib',
          targetIndexPatternType: 'tb'
        };

        init({ currentDashboardId, indexPatterns, savedDashboards, savedSearches });

        const timeBasedIndicesStub = sinon.stub(kibiState, 'timeBasedIndices');
        timeBasedIndicesStub.withArgs('ia').returns([ 'ia' ]);
        timeBasedIndicesStub.withArgs('ib').returns([ 'ib' ]);

        appState.filters = [
          {
            term: {
              field: 'aaa'
            },
            meta: {
              disabled: false
            }
          }
        ];

        return sequentialJoinVisHelper.getJoinSequenceFilter(currentDashboardId, button).then((rel) => {
          sinon.assert.called(timeBasedIndicesStub);
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.join_sequence[0].relation[0].path).to.be(button.sourceField);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must).to.have.length(4);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[0]).to.be.eql({
            term: {
              field: 'aaa'
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[1]).to.be.eql({
            query_string: {
              query: '*',
              analyze_wildcard: true
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[2]).to.be.eql({ match: { a: 123 } });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[3]).to.be.eql({
            range: {
              date: {
                gte: parseWithPrecision(defaultTimeStart, false).valueOf(),
                lte: parseWithPrecision(defaultTimeEnd, true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('long');
          expect(rel.join_sequence[0].relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.join_sequence[0].relation[1].path).to.be(button.targetField);
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('long');
        });
      });

      it('should get the query from the search meta', function () {
        init({ indexPatterns, savedDashboards, savedSearches });

        const timeBasedIndicesStub = sinon.stub(kibiState, 'timeBasedIndices');
        timeBasedIndicesStub.withArgs('ia').returns([ 'ia' ]);
        timeBasedIndicesStub.withArgs('ib').returns([ 'ib' ]);

        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };
        return sequentialJoinVisHelper.getJoinSequenceFilter('dashboardA', button).then((rel) => {
          sinon.assert.called(timeBasedIndicesStub);
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.join_sequence[0].relation[0].path).to.be(button.sourceField);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must).to.have.length(3);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[0]).to.be.eql({
            query_string: {
              query: '*',
              analyze_wildcard: true
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[1]).to.be.eql({ match: { a: 123 } });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[2]).to.be.eql({
            range: {
              date: {
                gte: parseWithPrecision(defaultTimeStart, false).valueOf(),
                lte: parseWithPrecision(defaultTimeEnd, true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('long');
          expect(rel.join_sequence[0].relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.join_sequence[0].relation[1].path).to.be(button.targetField);
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('long');
        });
      });

      it('should set the default siren-vanguard parameters', function () {
        init({ indexPatterns, savedDashboards, savedSearches });

        const timeBasedIndicesStub = sinon.stub(kibiState, 'timeBasedIndices');
        timeBasedIndicesStub.withArgs('ia').returns([ 'ia' ]);
        timeBasedIndicesStub.withArgs('ib').returns([ 'ib' ]);

        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };
        return sequentialJoinVisHelper.getJoinSequenceFilter('dashboardA', button).then((rel) => {
          sinon.assert.called(timeBasedIndicesStub);
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('long');
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('long');
        });
      });

      it('should set the advanced siren-vanguard parameters', function () {
        init({ indexPatterns, savedSearches, savedDashboards });

        const relations = {
          relationsIndices: [
            {
              type: 'INNER_JOIN',
              indices: [
                {
                  indexPatternId: 'ia',
                  path: 'fa'
                },
                {
                  indexPatternId: 'ib',
                  path: 'fb'
                }
              ],
              label: 'rel',
              id: 'ia//fa/ib//fb'
            }
          ]
        };
        config.set('kibi:relations', relations);

        $rootScope.$emit('change:config.kibi:relations', relations);
        $rootScope.$digest();

        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };

        const timeBasedIndicesStub = sinon.stub(kibiState, 'timeBasedIndices');
        timeBasedIndicesStub.withArgs('ia').returns([ 'ia' ]);
        timeBasedIndicesStub.withArgs('ib').returns([ 'ib' ]);

        return sequentialJoinVisHelper.getJoinSequenceFilter('dashboardA', button).then(rel => {
          sinon.assert.called(timeBasedIndicesStub);
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].type).to.be('INNER_JOIN');
        });
      });
    });

    describe('composeGroupFromExistingJoinFilters', function () {
      beforeEach(() => init());

      it('should create a group and add it', function () {
        const existingFilters = [
          {
            join_sequence: [{ indices: ['index1'] }, { indices: ['index2'] }]
          },
          {
            join_sequence: [{ indices: ['index3'] }, { indices: ['index4'] }]
          }
        ];

        const expected = {
          group: [
            [{ indices: ['index1'] }, { indices: ['index2'] }],
            [{ indices: ['index3'] }, { indices: ['index4'] }]
          ]
        };

        const actual = sequentialJoinVisHelper.composeGroupFromExistingJoinFilters(existingFilters);
        expect(actual).to.eql(expected);
      });
    });

  });
});
