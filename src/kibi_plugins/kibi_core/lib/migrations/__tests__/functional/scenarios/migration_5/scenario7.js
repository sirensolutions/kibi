export default {
  baseDir: __dirname,
  bulk: [
    {
      indexName: '.kibi',
      indexDefinition: 'index_definition.js',
      source: 'index_data7.js',
      haltOnFailure: true
    }
  ]
};
