export default {
  baseDir: __dirname,
  bulk: [{
    indexName: '.kibi',
    indexDefinition: 'index_definition_no_mapping.js',
    source: 'index_data.js',
    haltOnFailure: true
  }]
};
