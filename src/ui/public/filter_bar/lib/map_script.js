export function FilterBarLibMapScriptProvider(Promise, courier) {
  return function (filter) {
    if (filter.script) {
      return courier
      .indexPatterns
      .get(filter.meta.index).then(function (indexPattern) {
        const type = 'scripted';
        const key = filter.meta.field;
        const field = indexPattern.fields.byName[key];
        // kibi: handle case where the field is no longer present in the index-pattern
        if (!field) {
          return Promise.reject(filter);
        }
        // kibi: end
        let value;
        if (filter.meta.formattedValue) {
          value = filter.meta.formattedValue;
        } else {
          value = filter.script.script.params.value;
          value = field.format.convert(value);
        }
        return { type, key, value };
      });
    }
    return Promise.reject(filter);
  };
}
