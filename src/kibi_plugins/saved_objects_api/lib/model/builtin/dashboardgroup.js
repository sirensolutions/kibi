import Joi from 'joi';
import Model from '../model';

/**
 * Model for dashboardgroup objects.
 */
export default class DashboardGroupModel extends Model {
  constructor(server) {
    const schema = Joi.object().keys({
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

    super(server, 'dashboardgroup', schema, 'Dashboard group');
  }
}
