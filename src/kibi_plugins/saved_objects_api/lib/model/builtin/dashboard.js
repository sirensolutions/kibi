import Joi from 'joi';
import Model from '../model';

/**
 * Model for dashboard objects.
 */
export default class DashboardModel extends Model {
  constructor(server) {
    const schema = Joi.object().keys({
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
      priority: Joi.number(),
      kibanaSavedObjectMeta: Joi.object().keys({
        searchSourceJSON: Joi.string()
      })
    });

    super(server, 'dashboard', schema, 'Dashboard');
  }
}
