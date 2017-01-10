import FieldList from 'ui/index_patterns/_field_list';

/**
 * Adds support to virtual fields to an IndexPattern.
 */
export default function VirtualIndexPatternFactory(Private) {
  function VirtualIndexPattern(wrappedIndexPattern) {
    const self = this;
    self.wrapped = wrappedIndexPattern;
    self.fieldList = self.wrapped.fields;
    self.virtualFields = [];

    function wrappedFunction(functionName) {
      return function () {
        return self.wrapped[functionName].apply(self.wrapped, arguments);
      };
    }

    for (const attr in self.wrapped) {
      if (typeof self.wrapped[attr] === 'function') {
        self[attr] = wrappedFunction(attr);
      } else {
        if (attr === 'fields') {
          continue;
        } else {
          self[attr] = self.wrapped[attr];
        }
      }
    }

    Object.defineProperty(VirtualIndexPattern.prototype, 'fields', {
      get: function () {
        return self.fieldList;
      },
      configurable: true
    });
  }

  VirtualIndexPattern.prototype.addVirtualField = function (field) {
    this.virtualFields.push(field);
    this.fieldList = new FieldList(this.wrapped,
      this.wrapped.fields.raw.concat(this.virtualFields));
  };

  return VirtualIndexPattern;
};
