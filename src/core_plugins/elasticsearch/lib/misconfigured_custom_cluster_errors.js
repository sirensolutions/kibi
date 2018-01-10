export function getConfigMismatchErrorMessage(clusterName) {
  return 'Could not find configuration for [' + clusterName + '] cluster. ' +
         'Check if there is a match between elasticsearch.connector.admin.cluster property ' +
         'and any cluster configured in elasticsearch.clusters property';
}
