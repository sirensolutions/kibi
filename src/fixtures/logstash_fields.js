import { castEsToKbnFieldTypeName } from '../utils';
import { shouldReadFieldFromDocValues } from '../server/index_patterns/service/lib/field_capabilities/should_read_field_from_doc_values';

function stubbedLogstashFields() {
  // kibi: added path field to the metadata object
  return [
    //TODO MERGE 5.5.2
    // //                                  |indexed
    // //                                  |      |analyzed
    // //                                  |      |      |aggregatable
    // //                                  |      |      |      |searchable
    // // name                type         |      |      |      |     |metadata
    // ['bytes',             'number',     true,  true,  true,  true,  { path: [ 'bytes' ], count: 10, docValues: true } ],
    // ['ssl',               'boolean',    true,  true,  true,  true,  { path: [ 'ssl' ], count: 20 } ],
    // ['@timestamp',        'date',       true,  true,  true,  true,  { path: [ '@timestamp' ], count: 30 } ],
    // ['time',              'date',       true,  true,  true,  true,  { path: [ 'time' ], count: 30 } ],
    // ['@tags',             'string',     true,  true,  true,  true,  { path: [ '@tags' ] } ],
    // ['utc_time',          'date',       true,  true,  true,  true,  { path: [ 'utc_time' ] } ],
    // ['phpmemory',         'number',     true,  true,  true,  true,  { path: [ 'phpmemory' ] } ],
    // ['ip',                'ip',         true,  true,  true,  true,  { path: [ 'ip' ] } ],
    // ['request_body',      'attachment', true,  true,  true,  true,  { path: [ 'request_body' ] } ],
    // ['point',             'geo_point',  true,  true,  true,  true,  { path: [ 'point' ] } ],
    // ['area',              'geo_shape',  true,  true,  true,  true,  { path: [ 'area' ] } ],
    // ['hashed',            'murmur3',    true,  true,  false, true,  { path: [ 'hashed' ] } ],
    // ['geo.coordinates',   'geo_point',  true,  true,  true,  true,  { path: [ 'geo', 'coordinates' ] } ],
    // ['extension',         'string',     true,  true,  true,  true,  { path: [ 'extension' ] } ],
    // ['machine.os',        'string',     true,  true,  true,  true,  { path: [ 'machine', 'os' ] } ],
    // ['machine.os.raw',    'string',     true,  false, true,  true,  { docValues: true } ],
    // ['geo.src',           'string',     true,  true,  true,  true,  { path: [ 'geo', 'src' ] } ],
    // ['_id',               'string',     false, false, true,  true ],
    // ['_type',             'string',     false, false, true,  true ],
    // ['_source',           'string',     false, false, true,  true ],
    // ['non-filterable',    'string',     false, false, true,  false],
    // ['non-sortable',      'string',     false, false, false, false],
    // ['custom_user_field', 'conflict',   false, false, true,  true ],
    // ['script string',     'string',     false, false, true,  false, { script: '\'i am a string\'' } ],
    // ['script number',     'number',     false, false, true,  false, { script: '1234' } ],
    // ['script date',       'date',       false, false, true,  false, { script: '1234', lang: 'painless' } ],
    // ['script murmur3',    'murmur3',    false, false, true,  false, { script: '1234' } ],

    //                                  |aggregatable
    //                                  |      |searchable
    // name               esType        |      |      |metadata
    ['bytes',             'long',       true,  true,  { count: 10 } ],
    ['ssl',               'boolean',    true,  true,  { count: 20 } ],
    ['@timestamp',        'date',       true,  true,  { count: 30 } ],
    ['time',              'date',       true,  true,  { count: 30 } ],
    ['@tags',             'keyword',    true,  true ],
    ['utc_time',          'date',       true,  true ],
    ['phpmemory',         'integer',    true,  true ],
    ['ip',                'ip',         true,  true ],
    ['request_body',      'attachment', true,  true ],
    ['point',             'geo_point',  true,  true ],
    ['area',              'geo_shape',  true,  true ],
    ['hashed',            'murmur3',    false, true ],
    ['geo.coordinates',   'geo_point',  true,  true ],
    ['extension',         'keyword',    true,  true ],
    ['machine.os',        'text',       true,  true ],
    ['machine.os.raw',    'keyword',    true,  true ],
    ['geo.src',           'keyword',    true,  true ],
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

export default stubbedLogstashFields;
