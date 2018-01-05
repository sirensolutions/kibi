export default {
  baseDir: __dirname,
  bulk: [
    {
      indexName: '.kibi1',
      indexDefinition: 'index_definition.js',
      source: 'index_data1.js',
      haltOnFailure: true
    },
    {
      indexName: '.kibi2',
      indexDefinition: 'index_definition.js',
      source: 'index_data2.js',
      haltOnFailure: true
    },
    {
      indexName: '.kibi3',
      indexDefinition: 'index_definition.js',
      source: 'index_data3.js',
      haltOnFailure: true
    },
    {
      indexName: '.kibi4',
      indexDefinition: 'index_definition.js',
      source: 'index_data4.js',
      haltOnFailure: true
    }
  ]
};
