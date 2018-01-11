export function getConfigMismatchErrorMessage(clusterName) {
  return 'Could not find configuration for [' + clusterName + '] cluster. ' +
         'Check if there is a match between elasticsearch.siren.connector.admin.cluster property ' +
         'and any cluster configured in elasticsearch.siren.clusters property';
}
