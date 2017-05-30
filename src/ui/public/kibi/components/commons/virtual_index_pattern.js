import FieldListProvider from 'ui/index_patterns/_field_list';

/**
 * Adds support to virtual fields to an IndexPattern.
 */
export default function VirtualIndexPatternFactory(Private) {
  const FieldList = Private(FieldListProvider);

  return function VirtualIndexPattern(wrappedIndexPattern, virtualField) {
    const fieldList = new FieldList(wrappedIndexPattern, wrappedIndexPattern.fields.raw.concat(virtualField));

    for (const attr in wrappedIndexPattern) {
      if (typeof wrappedIndexPattern[attr] === 'function') {
        this[attr] = () => wrappedIndexPattern[attr].apply(wrappedIndexPattern, arguments);
      } else if (attr !== 'fields') {
        this[attr] = wrappedIndexPattern[attr];
      }
    }

    Object.defineProperty(VirtualIndexPattern.prototype, 'fields', {
      get: () => fieldList,
      configurable: true
    });
  };
};
