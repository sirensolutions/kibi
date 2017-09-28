import { each } from 'lodash';

/**
 * Returns the Elasticsearch mapping type for a Joi instance.
 *
 * @param {Joi} joi - A Joi instance.
 */
function getElasticsearchMappingType(joi) {
  switch (joi.type) {
    case 'string':
      return { type: 'text' };
    case 'boolean':
      return { type: 'boolean' };
    case 'any':
      return { type: 'object' };
    case 'object':
      if (joi.children) {
        const body = {
          properties: {}
        };
        each(joi.children, (child, name) => {
          body.properties[name] = getElasticsearchMappingType(child);
        });
        return body;
      } else {
        return { type: 'text' };
      }
      break;
    case 'date':
      return { type: 'date' };
    case 'number':
      if (joi.rules) {
        for (const rule of joi.rules) {
          if (rule.name === 'integer') {
            return { type: 'integer' };
          }
        }
      }
      return {
        type: 'long'
      };
    default:
      throw new Error(`Can't map Joi type ${joi.type} to Elasticsearch mapping type.`);
  }

}

export default function joiToMapping(schema) {
  const properties = {};
  const children = schema.describe().children;
  for (const key of Object.keys(children)) {
    properties[key] = getElasticsearchMappingType(children[key]);
  }
  return properties;
}
