import { has } from 'lodash';
export default function mapRangeProvider(Promise, courier) {
  return function (filter) {
    if (!filter.range) return Promise.reject(filter);

    return courier
    .indexPatterns
    .get(filter.meta.index)
    .then(function (indexPattern) {
      const key = Object.keys(filter.range)[0];
      // kibi: handle case where the field is no longer present in the index-pattern
      const field = indexPattern.fields.byName[key];
      if (!field) {
        return Promise.reject(filter);
      }
      // kibi: end
      const convert = field.format.getConverterFor('text');
      const range = filter.range[key];

      let left = has(range, 'gte') ? range.gte : range.gt;
      if (left == null) left = -Infinity;

      let right = has(range, 'lte') ? range.lte : range.lt;
      if (right == null) right = Infinity;

      return {
        key: key,
        value: `${convert(left)} to ${convert(right)}`
      };
    });

  };
}
