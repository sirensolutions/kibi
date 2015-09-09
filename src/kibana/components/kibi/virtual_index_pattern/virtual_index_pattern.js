define(function (require) {
  return function VirtualIndexPatternFactory(Private) {
    var FieldList = Private(require('components/index_patterns/_field_list'));

    /**
     * Adds support to virtual fields to an IndexPattern.
     */

    function VirtualIndexPattern(wrappedIndexPattern) {
      var self = this;
      self.wrapped = wrappedIndexPattern;
      self.fieldList = self.wrapped.fields;
      self.virtualFields = [];

      function wrapped_function(function_name) {
        return function () {
          return self.wrapped[function_name].apply(self.wrapped, arguments);
        };
      }

      for (var attr in self.wrapped) {
        if (typeof self.wrapped[attr] === 'function') {
          self[attr] = wrapped_function(attr);
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
});
