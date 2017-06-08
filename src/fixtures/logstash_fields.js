function stubbedLogstashFields() {
  // kibi: added path field to the metadata object
  return [
    //                                  |indexed
    //                                  |      |analyzed
    //                                  |      |      |aggregatable
    //                                  |      |      |      |searchable
    // name                type         |      |      |      |     |metadata
    ['bytes',             'number',     true,  true,  true,  true,  { path: [ 'bytes' ], count: 10, docValues: true } ],
    ['ssl',               'boolean',    true,  true,  true,  true,  { path: [ 'ssl' ], count: 20 } ],
    ['@timestamp',        'date',       true,  true,  true,  true,  { path: [ '@timestamp' ], count: 30 } ],
    ['time',              'date',       true,  true,  true,  true,  { path: [ 'time' ], count: 30 } ],
    ['@tags',             'string',     true,  true,  true,  true,  { path: [ '@tags' ] } ],
    ['utc_time',          'date',       true,  true,  true,  true,  { path: [ 'utc_time' ] } ],
    ['phpmemory',         'number',     true,  true,  true,  true,  { path: [ 'phpmemory' ] } ],
    ['ip',                'ip',         true,  true,  true,  true,  { path: [ 'ip' ] } ],
    ['request_body',      'attachment', true,  true,  true,  true,  { path: [ 'request_body' ] } ],
    ['point',             'geo_point',  true,  true,  true,  true,  { path: [ 'point' ] } ],
    ['area',              'geo_shape',  true,  true,  true,  true,  { path: [ 'area' ] } ],
    ['hashed',            'murmur3',    true,  true,  false, true,  { path: [ 'hashed' ] } ],
    ['geo.coordinates',   'geo_point',  true,  true,  true,  true,  { path: [ 'geo', 'coordinates' ] } ],
    ['extension',         'string',     true,  true,  true,  true,  { path: [ 'extension' ] } ],
    ['machine.os',        'string',     true,  true,  true,  true,  { path: [ 'machine', 'os' ] } ],
    ['machine.os.raw',    'string',     true,  false, true,  true,  { docValues: true } ],
    ['geo.src',           'string',     true,  true,  true,  true,  { path: [ 'geo', 'src' ] } ],
    ['_id',               'string',     false, false, true,  true ],
    ['_type',             'string',     false, false, true,  true ],
    ['_source',           'string',     false, false, true,  true ],
    ['non-filterable',    'string',     false, false, true,  false],
    ['non-sortable',      'string',     false, false, false, false],
    ['custom_user_field', 'conflict',   false, false, true,  true ],
    ['script string',     'string',     false, false, true,  false, { script: '\'i am a string\'' } ],
    ['script number',     'number',     false, false, true,  false, { script: '1234' } ],
    ['script date',       'date',       false, false, true,  false, { script: '1234', lang: 'painless' } ],
    ['script murmur3',    'murmur3',    false, false, true,  false, { script: '1234' } ],
  ].map(function (row) {
    const [
      name,
      type,
      indexed,
      analyzed,
      aggregatable,
      searchable,
      metadata = {}
    ] = row;

    const {
      docValues = false,
      count = 0,
      script,
      lang = script ? 'expression' : undefined,
      scripted = !!script,
      path // kibi: field path information
    } = metadata;

    return {
      path, // kibi: field path information
      name,
      type,
      doc_values: docValues,
      indexed,
      analyzed,
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
