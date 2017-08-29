import { IndexPatternsFieldListProvider } from 'ui/index_patterns/_field_list';

/**
 * Adds support to virtual fields to an IndexPattern.
 */
export default function VirtualIndexPatternFactory(Private) {
  const FieldList = Private(IndexPatternsFieldListProvider);

  return function VirtualIndexPattern(wrappedIndexPattern, virtualField) {
    const fieldList = new FieldList(wrappedIndexPattern, wrappedIndexPattern.fields.raw.concat(virtualField));

    // Could be solved by a Proxy class but currently Proxy is not fully supported by all browsers.
    const wrap = attr => {
      if (typeof wrappedIndexPattern[attr] === 'function') {
        this[attr] = (...args) => wrappedIndexPattern[attr].apply(wrappedIndexPattern, args);
      } else if (attr !== 'fields') {
        this[attr] = wrappedIndexPattern[attr];
      }
    };

    for (const attr in wrappedIndexPattern) { // eslint-disable-line
      wrap(attr);
    }
    for (const attr of Object.getOwnPropertyNames(Object.getPrototypeOf(wrappedIndexPattern))) {
      wrap(attr);
    }

    Object.defineProperty(VirtualIndexPattern.prototype, 'fields', {
      get: () => fieldList,
      configurable: true
    });
  };
};
