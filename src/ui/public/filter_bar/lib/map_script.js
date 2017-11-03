define(function () {
  return function mapScriptProvider(Promise, courier) {
    return function (filter) {
      let key;
      let value;
      let field;
      if (filter.script) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          key = filter.meta.field;
          field = indexPattern.fields.byName[key];

          // kibi: handle case where the field is no longer present in the index-pattern
          if (!field) {
            return Promise.reject(filter);
          }
          // kibi: end
          if (filter.meta.formattedValue) {
            value = filter.meta.formattedValue;
          } else {
            value = filter.script.script.params.value;
            value = field.format.convert(value);
          }

          return { key: key, value: value };
        });
      }
      return Promise.reject(filter);
    };
  };
});
