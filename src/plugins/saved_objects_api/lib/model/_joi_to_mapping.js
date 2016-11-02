/**
 * Returns the Elasticsearch mapping type for a Joi instance.
 *
 * @param {Joi} joi - A Joi instance.
 */
function getElasticsearchMappingType(joi) {
  switch (joi.type) {
    case 'string':
    case 'object':
      return 'string';
    case 'date':
      return 'date';
    case 'number':
      for (let rule of joi.rules) {
        if (rule.name === 'integer') {
          return 'integer';
        }
      }
    default:
      throw new Error(`Can't map Joi type ${joi.type} to Elasticsearch mapping type.`);
  }

}

export default function joiToMapping(schema) {
  let properties = {};
  let children = schema.describe().children;
  for (let key of Object.keys(children)) {
    properties[key] = {
      type: getElasticsearchMappingType(children[key])
    };
  }
  return properties;
}
