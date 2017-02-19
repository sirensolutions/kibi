import Joi from 'joi';
import Model from '../model';

/**
 * Model for session objects.
 */
export default class SessionModel extends Model {
  constructor(server) {

    const schema = Joi.object().keys({
      description: Joi.string().default(null),
      session_data: Joi.object().default({}),
      version: Joi.number().integer(),
      timeCreated: Joi.date(),
      timeUpdated: Joi.date(),
      kibanaSavedObjectMeta: Joi.object().keys({
        searchSourceJSON: Joi.string()
      })
    });

    super(server, 'session', schema, 'Session');
  }
}
