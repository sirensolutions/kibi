export default {
  baseDir: __dirname,
  bulk: [
    {
      indexName: 'article',
      source: 'article_several_types.js',
      haltOnFailure: true
    },
    {
      indexName: 'company',
      source: 'company_several_types.js',
      haltOnFailure: true
    },
    {
      indexName: 'onetype',
      source: 'one_type.js',
      haltOnFailure: true
    },
    {
      indexName: '.kibi',
      indexDefinition: 'index_definition.js',
      source: 'index_data4.js',
      haltOnFailure: true
    }
  ]
};
