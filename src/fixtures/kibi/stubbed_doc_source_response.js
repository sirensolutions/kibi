import { stubbedLogstashFields } from 'fixtures/logstash_fields';

export function stubbedDocSourceResponse(Private) {
  const mockLogstashFields = Private(stubbedLogstashFields);

  return function (id, index) {
    index = index || '.kibana';
    return {
      _id: id,
      _index: index,
      _type: 'index-pattern',
      _version: 2,
      found: true,
      _source: {
        customFormats: '{}',
        fields: JSON.stringify(mockLogstashFields)
      }
    };
  };
}
