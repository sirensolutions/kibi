import { each } from 'lodash';

/**
 * Returns the Elasticsearch mapping type for a Joi instance.
 *
 * @param {Joi} joi - A Joi instance.
 */
function getElasticsearchMappingType(joi) {
  switch (joi.type) {
    case 'string':
      return {type: 'string'};
    case 'object':
      if (joi.children) {
        let body = {
          properties: {}
        };
        each(joi.children, (child, name) => {
          body.properties[name] = getElasticsearchMappingType(child);
        });
        return body;
      } else {
        return {type: 'string'};
      }
      break;
    case 'date':
      return {type: 'date'};
    case 'number':
      for (let rule of joi.rules) {
        if (rule.name === 'integer') {
          return {type: 'integer' };
        }
      }
      throw new Error(`Can't map Joi type ${joi.type} to Elasticsearch mapping type.`);
    default:
      throw new Error(`Can't map Joi type ${joi.type} to Elasticsearch mapping type.`);
  }

}

export default function joiToMapping(schema) {
  let properties = {};
  let children = schema.describe().children;
  for (let key of Object.keys(children)) {
    properties[key] = getElasticsearchMappingType(children[key]);
  }
  return properties;
}
