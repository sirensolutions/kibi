import _ from 'lodash';

export default function joinFields(relations, indexPatternId, fieldName) {
  const joinFields = _(relations).map(function (relation) {
    if (relation.domain.id === indexPatternId && relation.domain.field === fieldName) {
      return {
        indexPatternId: relation.range.id,
        path: relation.range.field
      };
    }
    if (relation.range.id === indexPatternId && relation.range.field === fieldName) {
      return {
        indexPatternId: relation.domain.id,
        path: relation.domain.field
      };
    }
  }).compact().value();

  // Dedupe the values, as there are 2 directed relations per field.
  return _.uniq(joinFields, (value) => {
    return JSON.stringify(value);
  });
};
