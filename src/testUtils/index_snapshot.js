 /**
  * Takes a snapshot of an index during functional tests.
  *
  * @param {elasticsearch.client} An elasticsearch client.
  * @param {String} index The index name.
  * @return {Map} having the id's as keys and the hits as values.
  */
export default async function indexSnapshot(client, index) {
  let response = await client.search({
    index: index,
    size: 100
  });

  return response.hits.hits.reduce((acc, value) => acc.set(value._id, value), new Map());
}
