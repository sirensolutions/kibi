export default {
  baseDir: __dirname,
  bulk: [{
    indexName: '.kibi',
    indexDefinition: 'index_definition_with_mapping.js',
    source: 'index_data.js',
    haltOnFailure: true
  }]
};
