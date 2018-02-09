export default {
  baseDir: __dirname,
  bulk: [
    {
      indexName: '.siren1',
      indexDefinition: 'index_definition1.js',
      source: 'index_data.js',
      haltOnFailure: true
    },
    {
      indexName: '.siren2',
      indexDefinition: 'index_definition2.js',
      source: 'index_data.js',
      haltOnFailure: true
    }
  ]
};
