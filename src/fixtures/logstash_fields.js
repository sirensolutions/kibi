import { castEsToKbnFieldTypeName } from '../utils';
import { shouldReadFieldFromDocValues } from '../server/index_patterns/service/lib/field_capabilities/should_read_field_from_doc_values';

export function stubbedLogstashFields() {
  // kibi: added path field to the metadata object
  return [
    //                                  |aggregatable
    //                                  |      |searchable
    // name               esType        |      |      |metadata
    ['bytes',             'long',       true,  true,  { path: [ 'bytes' ], count: 10 } ],
    ['ssl',               'boolean',    true,  true,  { path: [ 'ssl' ], count: 20 } ],
    ['@timestamp',        'date',       true,  true,  { path: [ '@timestamp' ], count: 30 } ],
    ['time',              'date',       true,  true,  { path: [ 'time' ], count: 30 } ],
    ['@tags',             'keyword',    true,  true,  { path: [ '@tags' ] } ],
    ['utc_time',          'date',       true,  true,  { path: [ 'utc_time' ] } ],
    ['phpmemory',         'integer',    true,  true,  { path: [ 'phpmemory' ] } ],
    ['ip',                'ip',         true,  true,  { path: [ 'ip' ] } ],
    ['request_body',      'attachment', true,  true,  { path: [ 'request_body' ] } ],
    ['point',             'geo_point',  true,  true,  { path: [ 'point' ] } ],
    ['area',              'geo_shape',  true,  true,  { path: [ 'area' ] } ],
    ['hashed',            'murmur3',    false, true,  { path: [ 'hashed' ] } ],
    ['geo.coordinates',   'geo_point',  true,  true,  { path: [ 'geo', 'coordinates' ] } ],
    ['extension',         'keyword',    true,  true,  { path: [ 'extension' ] } ],
    ['machine.os',        'text',       true,  true,  { path: [ 'machine', 'os' ] } ],
    ['machine.os.raw',    'keyword',    true,  true ],
    ['geo.src',           'keyword',    true,  true,  { path: [ 'geo', 'src' ] } ],
    ['_id',               '_id',        true,  true ],
    ['_type',             '_type',      true,  true ],
    ['_source',           '_source',    true,  true ],
    ['non-filterable',    'text',       true,  false],
    ['non-sortable',      'text',       false, false],
    ['custom_user_field', 'conflict',   true,  true ],
    ['script string',     'text',       true,  false, { script: '\'i am a string\'' } ],
    ['script number',     'long',       true,  false, { script: '1234' } ],
    ['script date',       'date',       true,  false, { script: '1234', lang: 'painless' } ],
    ['script murmur3',    'murmur3',    true,  false, { script: '1234' } ],
  ].map(function (row) {
    const [
      name,
      esType,
      aggregatable,
      searchable,
      metadata = {}
    ] = row;

    const {
      count = 0,
      script,
      lang = script ? 'expression' : undefined,
      scripted = !!script,
      path // kibi: field path information
    } = metadata;

    // the conflict type is actually a kbnFieldType, we
    // don't have any other way to represent it here
    const type = esType === 'conflict' ? esType : castEsToKbnFieldTypeName(esType);

    return {
      path, // kibi: field path information
      name,
      type,
      readFromDocValues: shouldReadFieldFromDocValues(aggregatable, esType),
      aggregatable,
      searchable,
      count,
      script,
      lang,
      scripted,
    };
  });
}

