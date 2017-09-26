export function sendCreateIndexPatternRequest(indexPatterns, {
  id,
  name,
  timeFieldName,
  intervalName,
  notExpandable,
  excludeIndices,
}) {
  // get an empty indexPattern to start
  return indexPatterns.get()
    .then(indexPattern => {
      Object.assign(indexPattern, {
        id,
        title: name,
        timeFieldName,
        intervalName,
        notExpandable,
        excludeIndices,
      });

      // fetch the fields
      return indexPattern.create();
    });
}
