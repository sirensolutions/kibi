import _ from 'lodash';
export default function mapTermsProvider(Promise, courier) {
  return function (filter) {
    let key;
    let value;
    let field;
    if (filter.query && filter.query.match) {
      return courier
      .indexPatterns
      .get(filter.meta.index).then(function (indexPattern) {
        key = _.keys(filter.query.match)[0];
        field = indexPattern.fields.byName[key];
        // kibi: handle case where the field is no longer present in the index-pattern
        if (!field) {
          return Promise.reject(filter);
        }
        // kibi: end
        value = filter.query.match[key].query;
        value = field.format.convert(value);
        return { key: key, value: value };
      });
    }
    return Promise.reject(filter);
  };
}
