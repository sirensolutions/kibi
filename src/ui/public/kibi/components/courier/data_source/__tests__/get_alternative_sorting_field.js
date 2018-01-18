import expect from 'expect.js';
import ngMock from 'ng_mock';
import { getAlternativeSortingField } from '../get_alternative_sorting_field';
import { StubIndexPatternProvider } from 'test_utils/stub_index_pattern';

describe('Kibi Components', function () {
  describe('getAlternativeSortingField', function () {
    let indexPattern;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      const StubIndexPattern = Private(StubIndexPatternProvider);

      const fields = [];

      fields.push({
        name: 'num',
        type: 'number',
        esType: 'double',
        aggregatable: true,
        searchable: true,
        sortable: true
      });

      fields.push({
        name: 'key',
        type: 'string',
        esType: 'keyword',
        aggregatable: true,
        searchable: true,
        sortable: true
      });

      fields.push({
        name: 'key.string',
        type: 'string',
        esType: 'string',
        aggregatable: false,
        searchable: true,
        sortable: false
      });

      fields.push({
        name: 'label',
        type: 'string',
        esType: 'text',
        aggregatable: false,
        searchable: true,
        sortable: false
      });

      fields.push({
        name: 'label.rawstring',
        type: 'string',
        esType: 'string',
        aggregatable: true,
        searchable: true,
        sortable: true
      });

      fields.push({
        name: 'label.raw',
        type: 'string',
        esType: 'keyword',
        aggregatable: true,
        searchable: true,
        sortable: true
      });

      fields.push({
        name: 'title',
        type: 'string',
        esType: 'text',
        aggregatable: false,
        searchable: true,
        sortable: false
      });

      fields.push({
        name: 'title.analyzed',
        type: 'string',
        esType: 'string',
        aggregatable: false,
        searchable: true,
        sortable: false
      });

      fields.push({
        name: 'title.notanalyzed',
        type: 'string',
        esType: 'string',
        aggregatable: true,
        searchable: true,
        sortable: false
      });

      fields.push({
        name: 'book.title',
        type: 'string',
        esType: 'text',
        aggregatable: false,
        searchable: true,
        sortable: false
      });

      fields.push({
        name: 'book.title.raw',
        type: 'string',
        esType: 'keyword',
        aggregatable: true,
        searchable: true,
        sortable: true
      });

      indexPattern = new StubIndexPattern('test', null, fields);
      indexPattern.id = 'test';
    }));

    it('Should return null if type is not string or text', function () {
      const field = indexPattern.fields.byName.num;
      expect(getAlternativeSortingField(indexPattern, field)).to.equal(null);
    });

    it('Should return null if subfield of type string is present but it is analyzed', function () {
      const field = indexPattern.fields.byName.key;
      expect(getAlternativeSortingField(indexPattern, field)).to.equal(null);
    });

    it('Should return the first correct alternative field of type keyword if present', function () {
      const labelTextField = indexPattern.fields.byName.label;
      const labelRawField = indexPattern.fields.byName['label.raw'];
      expect(getAlternativeSortingField(indexPattern, labelTextField).name).to.eql(labelRawField.name);
    });

    it('Should return the first correct alternative field of type keyword if present (nested)', function () {
      const titleTextField = indexPattern.fields.byName['book.title'];
      const titleRawField = indexPattern.fields.byName['book.title.raw'];
      expect(getAlternativeSortingField(indexPattern, titleTextField).name).to.eql(titleRawField.name);
    });

    it('Should return the first correct alternative field of type string and not analyzed if present', function () {
      const field = indexPattern.fields.byName.title;
      const expected = indexPattern.fields.byName['title.notanalyzed'];
      expect(getAlternativeSortingField(indexPattern, field)).to.be(expected);
    });

  });

});
