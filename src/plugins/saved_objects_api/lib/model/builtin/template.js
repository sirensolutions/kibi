import Joi from 'joi';

/**
 * Schema for template objects.
 */
const TemplateSchema = Joi.object().keys({
  title: Joi.string(),
  description: Joi.string().default(null),
  templateSource: Joi.string(),
  templateEngine: Joi.string(),
  version: Joi.number().integer(),
  kibanaSavedObjectMeta: Joi.object().keys({
    searchSourceJSON: Joi.string()
  })
});

export default TemplateSchema;
