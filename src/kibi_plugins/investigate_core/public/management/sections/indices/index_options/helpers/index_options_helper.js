import _ from 'lodash';

export default function IndexOptionsHelperFactory(Promise, es, createNotifier) {

  // Method taken from /query_engine/lib/query_helper.js
  const getValueRegex = /(\[[^\[\]].*?\])/g;
  const _getValue = function (hit, group) {
    let value = null;

    let match = getValueRegex.exec(group);
    let i = 1;
    while (match !== null) {
      let propertyName =  match[1];
      // strip brackets
      propertyName = propertyName.substring(1, propertyName.length - 1);
      if (i === 1) {
        value = hit[propertyName];
      } else if (!(typeof (value[propertyName]) === 'undefined' || value[propertyName] === null)) {
        value = value[propertyName];
      } else {
        // The property was not found, so we add an empty string
        value = '';
      }
      i++;
      match = getValueRegex.exec(group);
    }
    return value;
  };

  // Method taken from /query_engine/lib/query_helper.js
  const parameterizedRegex = /(@doc\[.+?\]@)/g;
  const _evaluateParameterizedString = function (parameterizedLabel, hit) {
    let ret = parameterizedLabel;
    let match = parameterizedRegex.exec(parameterizedLabel);

    while (match !== null) {
      let group = match[1];
      group = group.replace('@doc', '');
      group = group.substring(0, group.length - 1);

      const value = _getValue(hit, group);

      // Escape special characters
      const reGroup = match[1].replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
      const re = new RegExp(reGroup, 'g');
      ret = ret.replace(re, value);

      match = parameterizedRegex.exec(parameterizedLabel);
    }

    ret = ret.split('\\n').join('\n');
    return ret;
  };

  const notify = createNotifier({
    location: 'Siren Entity Options Helper'
  });

  class IndexOptionsHelper {
    constructor() {
    }

    getEntityForUpdate(originEntity) {
      const entity = {
        id: originEntity.id
      };
      if (originEntity.label) {
        entity.label = originEntity.label;
      }
      if (originEntity.type) {
        entity.type = originEntity.type;
      }
      if (originEntity.icon) {
        entity.icon = originEntity.icon;
      }
      if (originEntity.color) {
        entity.color = originEntity.color;
      }
      if (originEntity.shortDescription) {
        entity.shortDescription = originEntity.shortDescription;
      }
      if (originEntity.longDescription) {
        entity.longDescription = originEntity.longDescription;
      }
      if (originEntity.instanceLabel.type) {
        entity.instanceLabelType = originEntity.instanceLabel.type;
      }
      if (originEntity.instanceLabel.value) {
        entity.instanceLabelValue = originEntity.instanceLabel.value;
      }
      return entity;
    }

    getInstanceLabelPreviewContent(entity) {
      if (entity.instanceLabel.value) {
        const request = {
          index: entity.id,
          body: {
            size: 10,
            query: { match_all: {} }
          }
        };
        return es.search(request)
        .then((results) => {
          let html = '';
          if (results.hits && results.hits.hits) {
            html += '<table>';
            html += '  <tr><th>Document id</th><th>Label</th></tr>';
            _.each(results.hits.hits, (hit) => {
              html += '  <tr>';
              html += '    <td>' + hit._id + '</td>';

              if (entity.instanceLabel.type === 'FIELD') {
                html += '    <td>' + hit._source[entity.instanceLabel.value] + '</td>';
              } else {
                html += '    <td>' + _evaluateParameterizedString(entity.instanceLabel.value, hit) + '</td>';
              }
              html += '</tr>';
            });
            html += '</table>';
          }
          return html;
        })
        .catch(notify.error);
      } else {
        return Promise.resolve('nothing to show');
      }
    };
  };

  return new IndexOptionsHelper();
};
