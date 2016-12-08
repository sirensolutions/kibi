import Joi from 'joi';

/**
 * Schema for dashboard objects.
 */
const DashboardSchema = Joi.object().keys({
  title: Joi.string(),
  hits: Joi.number().integer(),
  description: Joi.string(),
  panelsJSON: Joi.string(),
  optionsJSON: Joi.string(),
  uiStateJSON: Joi.string(),
  version: Joi.number().integer(),
  timeRestore: Joi.boolean(),
  timeMode: Joi.string(),
  timeTo: Joi.string(),
  timeFrom: Joi.string(),
  savedSearchId: Joi.string(),
  kibanaSavedObjectMeta: Joi.object().keys({
    searchSourceJSON: Joi.string()
  })
});

export default DashboardSchema;
