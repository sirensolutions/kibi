 /**
  * Takes a snapshot of an index during functional tests.
  *
  * @param {cluster} An elasticsearch cluster.
  * @param {String} index The index name.
  * @return {Map} having the id's as keys and the hits as values.
  */
export default async function indexSnapshot(cluster, index) {
  const response = await cluster.callWithInternalUser('search', {
    index: index,
    size: 100
  });

  return response.hits.hits.reduce((acc, value) => acc.set(value._id, value), new Map());
}
