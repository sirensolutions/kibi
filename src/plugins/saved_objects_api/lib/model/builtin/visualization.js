import Joi from 'joi';

/**
 * Schema for visualization objects.
 */
const VisualizationSchema  = Joi.object().keys({
  title: Joi.string(),
  description: Joi.string().default(null),
  visState: Joi.object().default({}),
  uiStateJSON: Joi.string().default(null),
  savedSearchId: Joi.string(),
  version: Joi.number().integer(),
  kibanaSavedObjectMeta: Joi.object().keys({
    searchSourceJSON: Joi.string()
  })
});

export default VisualizationSchema;

