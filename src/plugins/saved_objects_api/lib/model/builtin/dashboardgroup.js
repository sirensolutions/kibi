import Joi from 'joi';

/**
 * Schema for dashboardgroup objects.
 */
const DashboardgroupSchema = Joi.object().keys({
  title: Joi.string(),
  description: Joi.string(),
  dashboards: Joi.object(),
  priority: Joi.number(),
  iconCss: Joi.string(),
  iconUrl: Joi.string(),
  hide: Joi.boolean(),
  version: Joi.number().integer(),
  kibanaSavedObjectMeta: Joi.object().keys({
    searchSourceJSON: Joi.string()
  })
});

export default DashboardgroupSchema;
