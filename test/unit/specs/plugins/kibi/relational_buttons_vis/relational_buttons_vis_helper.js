define(function (require) {
  var sinon = require('test_utils/auto_release_sinon');

  var relationalButtonsVisHelper;

  function init() {
    return function () {
      module('kibana');

      inject(function ($injector, Private, _$rootScope_) {
        relationalButtonsVisHelper = Private(require('plugins/kibi/relational_buttons_vis/relational_buttons_vis_helper'));

        var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
        var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
        sinon.stub(urlHelper, 'getCurrentDashboardId').returns('dashboard 1');
      });
    };
  }

  describe('Kibi Components', function () {
    beforeEach(init());

    describe('relationalButtonsVisHelper', function () {

      describe('constructButtonArray', function () {
        it('empty buttonsDef array', function () {
          var buttonDefs = [];
          var expected = [];
          var buttons = relationalButtonsVisHelper.constructButtonsArray(buttonDefs);

          expect(buttons).to.eql(expected);
        });

        it('test that on click filter label is constructed when filterLabel empty', function () {
          var index = 'index1';
          var buttonDefs = [{
            sourceIndexPatternId: index,
            label: 'button 1',
            sourceCount: 123
          }];
          var buttons = relationalButtonsVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          var button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              value: ''
            }
          };

          button.click();
          expect(button.joinSeqFilter.meta.value).to.eql('... related to (123) from dashboard 1');
        });

        it('test that on click filter label is constructed when filterLabel defined', function () {
          var index = 'index1';
          var buttonDefs = [{
            sourceIndexPatternId: index,
            label: 'button 1',
            sourceCount: 123,
            filterLabel: 'My custom label with placeholders $COUNT $DASHBOARD'
          }];
          var buttons = relationalButtonsVisHelper.constructButtonsArray(buttonDefs, index);
          expect(buttons.length).to.equal(1);
          var button = buttons[0];
          expect(button.label).to.equal('button 1');
          expect(button.sourceIndexPatternId).to.equal('index1');
          expect(typeof button.click).to.equal('function');

          // now add fake join filter
          button.joinSeqFilter = {
            meta: {
              value: ''
            }
          };


          button.click();
          expect(button.joinSeqFilter.meta.value).to.eql('My custom label with placeholders 123 dashboard 1');
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

          var actual = relationalButtonsVisHelper.composeGroupFromExistingJoinFilters(existingFilters);
          expect(actual).to.eql(expected);

        });

      });

    });
  });
});
