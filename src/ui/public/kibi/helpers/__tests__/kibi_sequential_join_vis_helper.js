const MockState = require('fixtures/mock_state');
const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const sinon = require('auto-release-sinon');
const expect = require('expect.js');
const ngMock = require('ngMock');
const Promise = require('bluebird');
const dateMath = require('ui/utils/dateMath');

let sequentialJoinVisHelper;
let config;
let kibiState;
let appState;

const defaultTimeStart = '2006-09-01T12:00:00.000Z';
const defaultTimeEnd = '2009-09-01T12:00:00.000Z';

function init({ currentDashboardId = 'dashboard 1', indexPatterns = [], savedSearches = [],
              savedDashboards = [], enableEnterprise = false }) {
  ngMock.module('kibana', 'kibana/courier', 'kibana/global_state', ($provide) => {
    $provide.constant('kibiEnterpriseEnabled', enableEnterprise);
    $provide.constant('kbnDefaultAppId', '');
    $provide.constant('kibiDefaultDashboardId', '');
    $provide.constant('elasticsearchPlugins', []);

    $provide.service('config', require('fixtures/kibi/config'));

    appState = new MockState({ filters: [] });
    $provide.service('getAppState', function () {
      return function () { return appState; };
    });

    $provide.service('globalState', function () {
      return new MockState({ filters: [] });
    });
  });

  ngMock.module('kibana/index_patterns', function ($provide) {
    $provide.service('indexPatterns', (Promise) => mockSavedObjects(Promise)('indexPatterns', indexPatterns));
  });

  ngMock.module('discover/saved_searches', function ($provide) {
    $provide.service('savedSearches', (Promise) => mockSavedObjects(Promise)('savedSearches', savedSearches));
  });

  ngMock.module('app/dashboard', function ($provide) {
    $provide.service('savedDashboards', (Promise) => mockSavedObjects(Promise)('savedDashboards', savedDashboards));
  });

  ngMock.inject(function (timefilter, _config_, _kibiState_, Private, Promise) {
    kibiState = _kibiState_;
    config = _config_;
    sequentialJoinVisHelper = Private(require('ui/kibi/helpers/kibi_sequential_join_vis_helper'));
    sinon.stub(kibiState, '_getCurrentDashboardId').returns(currentDashboardId);
    sinon.stub(kibiState, 'saveAppState').returns(Promise.resolve());

    const defaultTime = {
      mode: 'absolute',
      from: defaultTimeStart,
      to: defaultTimeEnd
    };
    config.set('timepicker:timeDefaults', defaultTime);
    timefilter.time = defaultTime;
  });
}

describe('Kibi Components', function () {
  describe('sequentialJoinVisHelper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    describe('constructButtonArray', function () {
      beforeEach(() => init({}));

      it('empty buttonsDef array', function () {
        var buttonDefs = [];
        var expected = [];
        var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs);

        expect(buttons).to.eql(expected);
      });

      describe('custom filter label', function () {
        var index;
        var buttonDefs;

        beforeEach(function () {
          index = 'index1';
          buttonDefs = [
            {
              sourceIndexPatternId: index,
              label: 'button 1',
              getSourceCount: sinon.stub().returns(Promise.resolve(123))
            }
          ];
        });

        it('should set the default filter label if no custom is set', function (done) {
          var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          var button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          button.click().then(() => {
            expect(buttonDefs[0].getSourceCount.callCount).to.be(1);
            expect(button.joinSeqFilter.meta.alias).to.eql('... related to (123) from dashboard 1');
            done();
          }).catch(done);
        });

        it('should replace both $COUNT and $DASHBOARD occurrences', function (done) {
          buttonDefs[0].filterLabel = 'My custom label with placeholders $COUNT $DASHBOARD';
          var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          var button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };


          button.click().then(() => {
            expect(buttonDefs[0].getSourceCount.callCount).to.be(1);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label with placeholders 123 dashboard 1');
            done();
          }).catch(done);
        });

        it('should replace $DASHBOARD', function (done) {
          buttonDefs[0].filterLabel = 'My custom label $DASHBOARD';
          var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          var button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          button.click().then(() => {
            expect(buttonDefs[0].getSourceCount.callCount).to.be(0);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label dashboard 1');
            done();
          }).catch(done);
        });

        it('should replace $COUNT', function (done) {
          buttonDefs[0].filterLabel = 'My custom label $COUNT';
          var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          var button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          button.click().then(() => {
            expect(buttonDefs[0].getSourceCount.callCount).to.be(1);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label 123');
            done();
          }).catch(done);
        });

        it('should replace nothing', function (done) {
          buttonDefs[0].filterLabel = 'My custom label';
          var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          var button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              alias: ''
            }
          };

          button.click().then(() => {
            expect(buttonDefs[0].getSourceCount.callCount).to.be(0);
            expect(button.joinSeqFilter.meta.alias).to.eql('My custom label');
            done();
          }).catch(done);
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
            timeFieldName: 'date',
            fields: [
              {
                name: 'date'
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
                query: { a: 123 },
                filter: []
              })
            }
          }
        ];
      });

      it('should build the join_sequence', function (done) {
        const currentDashboardId = 'dashboardA';
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };

        init({ currentDashboardId, indexPatterns, savedDashboards, savedSearches });
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

        sequentialJoinVisHelper.getJoinSequenceFilter('dashboardA', button).then((rel) => {
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.join_sequence[0].relation[0].path).to.be(button.sourceField);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[0]).to.be.eql({
            query: {
              query_string: {
                query: '*',
                analyze_wildcard: true
              }
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[1]).to.be.eql({ query: { a: 123 } });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must[0]).to.be.eql({
            term: {
              field: 'aaa'
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.filter.bool.must[1]).to.be.eql({
            range: {
              date: {
                gte: dateMath.parseWithPrecision(defaultTimeStart, false).valueOf(),
                lte: dateMath.parseWithPrecision(defaultTimeEnd, true).valueOf(),
                format: 'epoch_millis'
              }
            }
          });
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('long');
          expect(rel.join_sequence[0].relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.join_sequence[0].relation[1].path).to.be(button.targetField);
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('long');
          done();
        }).catch(done);
      });

      it('should get the query from the search meta', function (done) {
        init({ indexPatterns, savedDashboards, savedSearches });
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };
        sequentialJoinVisHelper.getJoinSequenceFilter('dashboardA', button).then((rel) => {
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.join_sequence[0].relation[0].path).to.be(button.sourceField);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[0]).to.be.eql({
            query: {
              query_string: {
                query: '*',
                analyze_wildcard: true
              }
            }
          });
          expect(rel.join_sequence[0].relation[0].queries[0].query.bool.must[1]).to.be.eql({ query: { a: 123 } });
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('long');
          expect(rel.join_sequence[0].relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.join_sequence[0].relation[1].path).to.be(button.targetField);
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('long');
          done();
        }).catch(done);
      });

      it('should set the default siren-join parameters', function (done) {
        init({ indexPatterns, savedDashboards, savedSearches });
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };
        sequentialJoinVisHelper.getJoinSequenceFilter('dashboardA', button).then((rel) => {
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('long');
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('long');
          done();
        }).catch(done);
      });

      it('should set the advanced siren-join parameters', function (done) {
        init({
          enableEnterprise: true,
          indexPatterns: indexPatterns,
          savedSearches: savedSearches,
          savedDashboards: savedDashboards
        });


        kibiState.enableRelation({
          dashboards: [ 'dashboardA', 'dashboardB' ],
          relation: 'ia/fa/ib/fb'
        });
        config.set('kibi:relations', {
          relationsIndices: [
            {
              indices: [
                {
                  indexPatternId: 'ia',
                  path: 'fa',
                  termsEncoding: 'enc1'
                },
                {
                  indexPatternId: 'ib',
                  path: 'fb',
                  termsEncoding: 'enc2'
                }
              ],
              label: 'rel',
              id: 'ia/fa/ib/fb'
            }
          ]
        });

        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };
        sequentialJoinVisHelper.getJoinSequenceFilter('dashboardA', button).then((rel) => {
          expect(rel.join_sequence).to.have.length(1);
          expect(rel.join_sequence[0].relation).to.have.length(2);
          expect(rel.join_sequence[0].relation[0].termsEncoding).to.be('enc1');
          expect(rel.join_sequence[0].relation[1].termsEncoding).to.be('enc2');
          done();
        }).catch(done);
      });
    });

    describe('composeGroupFromExistingJoinFilters', function () {
      beforeEach(() => init({}));

      it('should create a group and add it', function () {
        var existingFilters = [
          {
            join_sequence: [{indices: ['index1']}, {indices: ['index2']}]
          },
          {
            join_sequence: [{indices: ['index3']}, {indices: ['index4']}]
          }
        ];

        var expected = {
          group: [
            [{indices: ['index1']}, {indices: ['index2']}],
            [{indices: ['index3']}, {indices: ['index4']}]
          ]
        };

        var actual = sequentialJoinVisHelper.composeGroupFromExistingJoinFilters(existingFilters);
        expect(actual).to.eql(expected);
      });
    });

  });
});
