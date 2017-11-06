import _ from 'lodash';

export function FilterBarLibMapPhraseProvider(Promise, courier) {
  return function (filter) {
    const isScriptedPhraseFilter = isScriptedPhrase(filter);
    if (!_.has(filter, ['query', 'match']) && !isScriptedPhraseFilter) {
      return Promise.reject(filter);
    }

    return courier
    .indexPatterns
    .get(filter.meta.index).then(function (indexPattern) {
      const type = 'phrase';
      const key = isScriptedPhraseFilter ? filter.meta.field : Object.keys(filter.query.match)[0];
      const field = indexPattern.fields.byName[key];
      // kibi: handle case where the field is no longer present in the index-pattern
      if (!field) {
        return Promise.reject(filter);
      }
      // kibi: end
      const query = isScriptedPhraseFilter ? filter.script.script.params.value : filter.query.match[key].query;
      const value = field.format.convert(query);
      return { type, key, value };
    });
  };
}

function isScriptedPhrase(filter) {
  const params = _.get(filter, ['script', 'script', 'params']);
  return params && params.value;
}
