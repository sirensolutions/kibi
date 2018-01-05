/**
 * Defines an index **without** index definition
 * This means no index will be created by the ES client
 */
export default {
  baseDir: __dirname,
  bulk: [{
    // Need to pass an empty array (from index_data5.js) here to load/reload the scenario
    // There is no index set in the client as the indexDefinition property of the object
    // has not been set
    indexName: 'fakeIndex', // Need to add an indexName here for the index unload function in scenarioManager
    source: 'index_data5.js',
    haltOnFailure: false
  }]
};
