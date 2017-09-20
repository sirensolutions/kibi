import { getAlternativeSortingField } from '../get_alternative_sorting_field';
import expect from 'expect.js';

describe('Kibi Components', function () {
  describe('getAlternativeSortingField', function () {

    it('Should return null if type is not string or text', function () {
      const field = {
        type: 'boo'
      };

      expect(getAlternativeSortingField(field)).to.equal(null);
    });

    it('Should return null if subfield of type string is present but it is analyzed', function () {
      const field = {
        type: 'label',
        type: 'string',
        multifields: [
          {
            name: 'label.rawstringanalyzed',
            type: 'string',
            analyzed: true
          }
        ]
      };

      expect(getAlternativeSortingField(field)).to.equal(null);
    });


    it('Should return the first correct alternative field of type keyword if present', function () {
      const expected = {
        name: 'label.rawkeyword',
        type: 'keyword'
      };

      const notExpected = {
        name: 'label.rawstring',
        type: 'string'
      };

      const field = {
        name: 'label',
        type: 'string',
        multifields: [
          notExpected,
          expected
        ]
      };

      expect(getAlternativeSortingField(field)).to.eql(expected);
    });

    it('Should return the first correct alternative field of type string and not analyzed if present', function () {
      const expected = {
        name: 'label.rawstringNOTanalyzed',
        type: 'string',
        analyzed: false
      };

      const notExpected = {
        name: 'label.rawstringanalyzed',
        type: 'string',
        analyzed: true
      };

      const field = {
        name: 'label',
        type: 'string',
        multifields: [
          notExpected,
          expected
        ]
      };

      expect(getAlternativeSortingField(field)).to.eql(expected);
    });

  });
});
