import { find } from 'lodash';

export function getAlternativeSortingField(indexPattern, indexField) {
  if (indexField.esType && (indexField.esType === 'text' || indexField.esType === 'string')) {
    const multifields = indexField.getMultiFields(indexPattern);
    if (multifields.length > 0) {
      // try to find a keyword subfield
      const keywordSubfield = find(multifields, sf => sf.esType === 'keyword');
      if (keywordSubfield) {
        return keywordSubfield;
      }
      // try to find a legacy string not analyzed field
      const stringNotAnalyzedSubField = find(multifields, sf => sf.type === 'string' && sf.aggregatable === true);
      if (stringNotAnalyzedSubField) {
        return stringNotAnalyzedSubField;
      }
    }
  }
  return null;
}
