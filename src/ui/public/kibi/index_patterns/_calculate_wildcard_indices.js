import { map } from 'lodash';

export function IndexPatternsCalculateWildcardIndicesProvider(Private, es) {

  function calculateWildcardIndices(pattern) {
    return es.fieldStats({
      index: pattern,
      ignoreUnavailable: true,
      level: 'indices',
      body: {
        fields: [ '_id' ]
      }
    })
    .then(resp => {
      return map(resp.indices, function (value, key) {
        return {
          index: key,
          min: -Infinity,
          max: Infinity
        };
      });
    });
  }

  return calculateWildcardIndices;
}
