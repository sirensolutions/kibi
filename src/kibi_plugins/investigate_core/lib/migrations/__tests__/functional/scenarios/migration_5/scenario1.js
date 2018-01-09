export default {
  baseDir: __dirname,
  bulk: [
    {
      indexName: 'article',
      source: 'article.js',
      haltOnFailure: true
    },
    {
      indexName: 'company',
      source: 'company.js',
      haltOnFailure: true
    },
    {
      indexName: '.siren',
      indexDefinition: 'index_definition.js',
      source: 'index_data1.js',
      haltOnFailure: true
    }
  ]
};
