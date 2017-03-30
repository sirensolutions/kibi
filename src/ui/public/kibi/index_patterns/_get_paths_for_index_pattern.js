import _ from 'lodash';

export default function getPathsForIndexPattern() {
  return function (response) {
    const mapProperties = function (properties, paths = {}, currentPath = []) {
      _.each(properties, (property, fieldName) => {
        currentPath.push(fieldName);
        if (property.properties) {
          // nested
          mapProperties(property.properties, paths, currentPath);
        } else {
          paths[currentPath.join('.')] = _.clone(currentPath);
        }
        currentPath.pop();
      });
      return paths;
    };

    const paths = {};
    _.each(response, (mapping, indexName) => {
      // put the default type at the end
      _(mapping.mappings)
      .sortBy((mapping, typeName) => typeName === '_default_' ? 1 : 0)
      .each(mappings => {
        _.defaults(paths, mapProperties(mappings.properties));
      })
      .value();
    });
    return paths;
  };
};
