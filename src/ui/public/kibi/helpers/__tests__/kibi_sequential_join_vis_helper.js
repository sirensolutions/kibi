var sinon = require('auto-release-sinon');
var expect = require('expect.js');
var ngMock = require('ngMock');

var sequentialJoinVisHelper;

function init() {
  return function () {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('enterpriseEnabled', false);
      $provide.constant('kbnDefaultAppId', '');
      $provide.constant('kibiDefaultDashboardId', '');
      $provide.constant('elasticsearchPlugins', []);
    });

    ngMock.inject(function ($injector, Private, _$rootScope_) {
      sequentialJoinVisHelper = Private(require('ui/kibi/helpers/kibi_sequential_join_vis_helper'));

      var kibiStateHelper  = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_state_helper'));
      var urlHelper        = Private(require('ui/kibi/helpers/url_helper'));
      sinon.stub(urlHelper, 'getCurrentDashboardId').returns('dashboard 1');
    });
  };
}

describe('Kibi Components', function () {
  beforeEach(init());

  describe('sequentialJoinVisHelper', function () {

    describe('constructButtonArray', function () {
      it('empty buttonsDef array', function () {
        var buttonDefs = [];
        var expected = [];
        var buttons = sequentialJoinVisHelper.constructButtonsArray(buttonDefs);

        expect(buttons).to.eql(expected);
      });

      it('test that on click filter label is constructed when filterLabel empty', function () {
        var index = 'index1';
        var buttonDefs = [{
          sourceIndexPatternId: index,
          label: 'button 1',
          sourceCount: 123
        }];
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
        expect(button.joinSeqFilter.meta.alias).to.eql('... related to (123) from dashboard 1');
      });

      it('test that on click filter label is constructed when filterLabel defined', function () {
        var index = 'index1';
        var buttonDefs = [{
          sourceIndexPatternId: index,
          label: 'button 1',
          sourceCount: 123,
          filterLabel: 'My custom label with placeholders $COUNT $DASHBOARD'
        }];
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
        expect(button.joinSeqFilter.meta.alias).to.eql('My custom label with placeholders 123 dashboard 1');
      });

    });


    describe('composeGroupFromExistingJoinFilters', function () {

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
