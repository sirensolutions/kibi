import _ from 'lodash';

export function IndicesEditSectionsProvider() {

  return function (entity) {
    let fieldCount = {};
    if (entity.type === 'INDEX_PATTERN') {
      fieldCount = _.countBy(entity.fields, function (field) {
        return (field.scripted) ? 'scripted' : 'indexed';
      });

      _.defaults(fieldCount, {
        indexed: 0,
        scripted: 0,
        sourceFilters: 0
      });

      return [
        {
          title: 'generic',
          index: 'indexOptions'
        },
        {
          title: 'fields',
          index: 'indexedFields',
          count: fieldCount.indexed
        },
        {
          title: 'scripted fields',
          index: 'scriptedFields',
          count: fieldCount.scripted
        },
        {
          title: 'source filters',
          index: 'sourceFilters',
          count: fieldCount.sourceFilters
        }
      ];
    } else {
      // Eid
      _.defaults(fieldCount, {
        relations: 0
      });
      return [
        {
          title: 'generic',
          index: 'indexOptions'
        }
      ];
    }
  };
}
