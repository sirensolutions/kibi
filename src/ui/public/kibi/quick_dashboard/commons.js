import _ from 'lodash';


export function promiseMapSeries(arr, map) {
  // This is a shim for Bluebird's Promise.mapSeries, that is available
  // starting from v3

  return arr.reduce(function (promiseChain, val, idx) {
    return promiseChain
      .then(results => Promise.resolve(map(val, idx))
        .then(res => [...results, res]));
  }, Promise.resolve([]));
}

export function fieldSpec(field) {
  return field.scripted
    ? { script: { inline: field.script, lang: field.lang } }
    : { field: field.name };
}

export function queryIsAnalyzed(mappings, index, field) {
  if(field.type === 'text') { return Promise.resolve(true); }

  // NOTE: Mappings are cached, so asking once per field is ok

  return mappings.getMapping(index.id)
    .then(indexMaps =>
      _.some(indexMaps, indexMap =>
        _.some(indexMap.mappings, typeMap => {
          const prop = typeMap.properties[field.name];
          if(!prop) { return false; }

          switch (prop.type) {
            case 'text':
              return true;

            case 'string':
              return (prop.index !== 'not_analyzed');

            default:
              return false;
          }
        })
      )
    );
}

