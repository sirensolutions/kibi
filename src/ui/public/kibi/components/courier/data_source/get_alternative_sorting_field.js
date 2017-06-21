import { find } from 'lodash';

export default function getAlternativeSortingField(indexField) {
  if (indexField.type && (indexField.type === 'string' || indexField.type === 'text')) {
    // search for subproperty with type keyword or string but not analyzed
    const multifields = indexField.multifields;
    if (multifields.length > 0) {
      // try to find a keyword subfield
      const keywordSubfield = find(multifields, sf => sf.type === 'keyword');
      if (keywordSubfield) {
        return keywordSubfield;
      }
      // try to find a string not analyzed subfield
      const stringNoyAnalyzedSubfield = find(multifields, sf => sf.type === 'string' && sf.analyzed === false);
      if (stringNoyAnalyzedSubfield) {
        return stringNoyAnalyzedSubfield;
      }
    }
  }
  return null;
}
