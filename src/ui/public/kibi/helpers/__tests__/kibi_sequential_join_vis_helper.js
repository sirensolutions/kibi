var MockState = require('fixtures/mock_state');
var sinon = require('auto-release-sinon');
var expect = require('expect.js');
var ngMock = require('ngMock');
var Promise = require('bluebird');

var sequentialJoinVisHelper;
var config;

function init(enableEnterprise = false) {
  return function () {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('kibiEnterpriseEnabled', enableEnterprise);
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardId', '');
      $provide.constant('elasticsearchPlugins', []);
      $provide.service('config', function () {
        var keys = {};
        return {
          get: function (key) { return keys[key]; },
          set: function (key, value) { keys[key] = value; }
        };
      });
      $provide.service('timefilter', function () {
        return {
          get: function () {
            return null;
          }
        };
      });

      $provide.service('getAppState', function () {
        return function () { return new MockState({ filters: [] }); };
      });

      $provide.service('globalState', function () {
        return new MockState({ filters: [] });
      });
    });

    ngMock.module('kibana/index_patterns', function ($provide) {
      $provide.service('indexPatterns', function (Promise) {
        return {
          get: function (id) {
            return Promise.resolve('');
          }
        };
      });
    });

    ngMock.inject(function (_config_, $injector, Private, _$rootScope_) {
      config = _config_;
      sequentialJoinVisHelper = Private(require('ui/kibi/helpers/kibi_sequential_join_vis_helper'));
      var urlHelper = Private(require('ui/kibi/helpers/url_helper'));
      sinon.stub(urlHelper, 'getCurrentDashboardId').returns('dashboard 1');
      sinon.stub(urlHelper, 'getDashboardQuery').returns({ query: { term: { aaa: 'bbb' } } });
    });
  };
}

describe('Kibi Components', function () {
  describe('sequentialJoinVisHelper', function () {

    describe('constructButtonArray', function () {
      beforeEach(init());

      it('empty buttonsDef array', function () {
        var buttonDefs = [];
        var expected = [];
        var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs);

        expect(buttons).to.eql(expected);
      });

      describe('custom filter label', function () {
        var index;
        var buttonDefs;
        function init() {
          index = 'index1';
          buttonDefs = [
            {
              sourceIndexPatternId: index,
              label: 'button 1',
              getSourceCount: sinon.stub().returns(Promise.resolve(123))
            }
          ];
        }

        beforeEach(init);

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

        it('should replace $DASHBOARD', function () {
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


          button.click();
          expect(buttonDefs[0].getSourceCount.callCount).to.be(0);
          expect(button.joinSeqFilter.meta.alias).to.eql('My custom label dashboard 1');
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

        it('should replace nothing', function () {
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


          button.click();
          expect(buttonDefs[0].getSourceCount.callCount).to.be(0);
          expect(button.joinSeqFilter.meta.alias).to.eql('My custom label');
        });
      });

    });

    describe('_getRelation', function () {
      require('testUtils/noDigestPromises').activateForSuite();
      it('should add the query from the search bar', function (done) {
        init()();
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };
        const savedSearchMeta = {
          query: { a: 123 },
          filter: []
        };
        const dashboardId = 'not-here';
        sequentialJoinVisHelper._getRelation({ dashboardId, button, savedSearchMeta }).then((rel) => {
          expect(rel.relation).to.have.length(2);
          expect(rel.relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.relation[0].path).to.be(button.sourceField);
          expect(rel.relation[0].queries[1]).to.be.eql({ a: 123 });
          expect(rel.relation[0].termsEncoding).to.be('long');
          expect(rel.relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.relation[1].path).to.be(button.targetField);
          expect(rel.relation[1].termsEncoding).to.be('long');
          done();
        }).catch(done);
      });

      it('should set the default siren-join parameters', function (done) {
        init()();
        const button = {
          sourceField: 'fa',
          sourceIndexPatternId: 'ia',
          targetField: 'fb',
          targetIndexPatternId: 'ib'
        };
        const savedSearchMeta = {
          query: '',
          filter: []
        };
        const dashboardId = 'not-here';
        sequentialJoinVisHelper._getRelation({ dashboardId, button, savedSearchMeta }).then((rel) => {
          expect(rel.relation).to.have.length(2);
          expect(rel.relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.relation[0].path).to.be(button.sourceField);
          expect(rel.relation[0].queries[0].query.bool.must).to.be.eql({ query: { term: { aaa: 'bbb' } } });
          expect(rel.relation[0].termsEncoding).to.be('long');
          expect(rel.relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.relation[1].path).to.be(button.targetField);
          expect(rel.relation[1].termsEncoding).to.be('long');
          done();
        }).catch(done);
      });

      it('should set the advanced siren-join parameters', function (done) {
        init(true)();
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
        const savedSearchMeta = {
          query: '',
          filter: []
        };
        const dashboardId = 'not-here';
        sequentialJoinVisHelper._getRelation({ dashboardId, button, savedSearchMeta }).then((rel) => {
          expect(rel.relation).to.have.length(2);
          expect(rel.relation[0].indices).to.eql([ button.sourceIndexPatternId ]);
          expect(rel.relation[0].path).to.be(button.sourceField);
          expect(rel.relation[0].queries[0].query.bool.must).to.be.eql({ query: { term: { aaa: 'bbb' } } });
          expect(rel.relation[0].termsEncoding).to.be('enc1');
          expect(rel.relation[1].indices).to.eql([ button.targetIndexPatternId ]);
          expect(rel.relation[1].path).to.be(button.targetField);
          expect(rel.relation[1].termsEncoding).to.be('enc2');
          done();
        }).catch(done);
      });
    });

    describe('composeGroupFromExistingJoinFilters', function () {
      beforeEach(init());

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
