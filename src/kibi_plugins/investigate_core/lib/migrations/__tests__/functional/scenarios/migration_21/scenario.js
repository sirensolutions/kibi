export default {
  baseDir: __dirname,
  bulk: [
    {
      indexName: '.siren1',
      indexDefinition: 'index_definition.js',
      source: 'index_data1.js',
      haltOnFailure: true
    },
    {
      indexName: '.siren2',
      indexDefinition: 'index_definition.js',
      source: 'index_data2.js',
      haltOnFailure: true
    }
  ]
};
