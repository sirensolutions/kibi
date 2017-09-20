import { StubIndexPatternProvider } from 'test_utils/stub_index_pattern';
import { stubbedLogstashFields } from 'fixtures/logstash_fields';
import { getKbnFieldType } from '../utils';

export function stubbedLogstashIndexPatternService(Private) {
  const StubIndexPattern = Private(StubIndexPatternProvider);
  const mockLogstashFields = Private(stubbedLogstashFields);

  const fields = mockLogstashFields.map(function (field) {
    const kbnType = getKbnFieldType(field.type);

    if (kbnType.name === 'unknown') {
      throw new TypeError(`unknown type ${field.type}`);
    }

    return {
      ...field,
      sortable: ('sortable' in field) ? !!field.sortable : kbnType.sortable,
      filterable: ('filterable' in field) ? !!field.filterable : kbnType.filterable,
      displayName: field.name,
    };
  });

  const indexPattern = new StubIndexPattern('logstash-*', 'time', fields);
  indexPattern.id = 'logstash-*';

  return indexPattern;

}
