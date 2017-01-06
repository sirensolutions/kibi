const mockSavedObjects = require('fixtures/kibi/mock_saved_objects');
const ngMock = require('ngMock');
const expect = require('expect.js');
const fakeSavedSearches = [
  {
    id: 'savedSearchWithTimeField',
    searchSource: {
      get: function (key) {
        if (key === 'index') {
          return {
            hasTimeField: function () { return true;}
          };
        }
      }
    }
  },
  {
    id: 'savedSearchWithoutTimeField',
    searchSource: {
      get: function (key) {
        if (key === 'index') {
          return {
            hasTimeField: function () { return false;}
          };
        }
      }
    }
  }
];


let hasAnyOfVisSavedSearchesATimeField;
let unsupportedType;
let kibiTimelineType1;
let kibiTimelineType2;
let requiresMultiSearchFalseType;

describe('Kibi Components', function () {
  describe('Commons', function () {
    describe('_has_any_of_vis_saved_searches_a_time_field', function () {

      beforeEach(function () {
        ngMock.module('kibana');

        ngMock.module('discover/saved_searches', function ($provide) {
          $provide.service('savedSearches', (Promise, Private) => mockSavedObjects(Promise, Private)('savedSearches', fakeSavedSearches));
        });

        ngMock.inject(function (Private) {
          hasAnyOfVisSavedSearchesATimeField = Private(require('ui/kibi/components/commons/_has_any_of_vis_saved_searches_a_time_field'));
          const TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));
          const VislibVisType = Private(require('ui/vislib_vis_type/VislibVisType'));

          kibiTimelineType1 = new TemplateVisType({
            name: 'kibi_timeline',
            template: '<div/>', // if not provided will throw an exception
            requiresMultiSearch: true,
          });

          kibiTimelineType2 = new VislibVisType({
            name: 'kibi_timeline',
            template: '<div/>', // if not provided will throw an exception
            requiresMultiSearch: true,
          });

          unsupportedType = new TemplateVisType({
            name: 'unsupported',
            template: '<div/>', // if not provided will throw an exception
            requiresMultiSearch: true,
          });

          requiresMultiSearchFalseType = new TemplateVisType({
            name: 'pie',
            template: '<div/>', // if not provided will throw an exception
            requiresMultiSearch: false,
          });

        });
      });

      require('testUtils/noDigestPromises').activateForSuite();

      describe('unsupported vis type', function () {

        it('should silently return false for unsupported vis type', function (done) {
          const vis = {
            type: unsupportedType
          };

          hasAnyOfVisSavedSearchesATimeField(vis).then(function (res) {
            expect(res).to.equal(false);
            done();
          }).catch(done);
        });

        it('should throw an error when type is not an instance of TemplateVisType or VislibVisType', function (done) {
          const vis = {
            type: 'kibi_timeline' // valid vis but type should be a TemplateVisType
          };

          hasAnyOfVisSavedSearchesATimeField(vis).then(function (res) {
            done('Should throw an error');
          }).catch(function (err) {
            expect(err.message).to.equal('vis.type should be an instance of TemplateVisType or VislibVisType');
            done();
          });
        });

      });

      describe('requiresMultiSearchFalseType (pie)', function () {

        it('should return false if no timeFieldName', function (done) {
          const vis = {
            type: requiresMultiSearchFalseType,
          };
          hasAnyOfVisSavedSearchesATimeField(vis).then(function (res) {
            expect(res).to.equal(false);
            done();
          }).catch(done);
        });

        it('should return true if there is timeFieldName', function (done) {
          const vis = {
            type: requiresMultiSearchFalseType,
          };
          hasAnyOfVisSavedSearchesATimeField(vis, 'myDate').then(function (res) {
            expect(res).to.equal(true);
            done();
          }).catch(done);
        });


      });

      describe('kibi timeline', function () {

        it('one group saved search has time field (kibiTimelineType1)', function (done) {
          const vis = {
            type: kibiTimelineType1,
            params: {
              groups: [
                {
                  savedSearchId: 'savedSearchWithTimeField'
                }
              ]
            }
          };

          hasAnyOfVisSavedSearchesATimeField(vis).then(function (res) {
            expect(res).to.equal(true);
            done();
          }).catch(done);
        });

        it('one group saved search has time field (kibiTimelineType2)', function (done) {
          const vis = {
            type: kibiTimelineType2,
            params: {
              groups: [
                {
                  savedSearchId: 'savedSearchWithTimeField'
                }
              ]
            }
          };

          hasAnyOfVisSavedSearchesATimeField(vis).then(function (res) {
            expect(res).to.equal(true);
            done();
          }).catch(done);
        });

        it('two groups, one with saved search which has time field', function (done) {
          const vis = {
            type: kibiTimelineType1,
            params: {
              groups: [
                {
                  savedSearchId: 'savedSearchWithTimeField'
                },
                {
                  savedSearchId: 'savedSearchWithoutTimeField'
                }
              ]
            }
          };

          hasAnyOfVisSavedSearchesATimeField(vis).then(function (res) {
            expect(res).to.equal(true);
            done();
          }).catch(done);
        });

        it('one group saved search has no time field', function (done) {
          const vis = {
            type: kibiTimelineType1,
            params: {
              groups: [
                {
                  savedSearchId: 'savedSearchWithoutTimeField'
                }
              ]
            }
          };

          hasAnyOfVisSavedSearchesATimeField(vis).then(function (res) {
            expect(res).to.equal(false);
            done();
          }).catch(done);
        });


      });
    });
  });
});
