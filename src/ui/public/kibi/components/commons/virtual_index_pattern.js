import FieldListProvider from 'ui/index_patterns/_field_list';

/**
 * Adds support to virtual fields to an IndexPattern.
 */
export default function VirtualIndexPatternFactory(Private) {
  const FieldList = Private(FieldListProvider);

  return function VirtualIndexPattern(wrappedIndexPattern, virtualField) {
    const self = this;

    self.fieldList = new FieldList(wrappedIndexPattern, wrappedIndexPattern.fields.raw.concat(virtualField));

    return new Proxy(wrappedIndexPattern, {
      get(target, name) {
        if (name === 'fields') {
          return self.fieldList;
        }
        return target[name];
      }
    });
  };
};
