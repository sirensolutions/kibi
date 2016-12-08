import Joi from 'joi';
import Model from './model';

/**
 * Model for session objects.
 */
export default class SessionModel extends Model {

  /**
   * Creates a new SessionModel.
   *
   * @param server - A Server instance.
   */
  constructor(server) {

    const schema = Joi.object().keys({
      description: Joi.string().default(null),
      session_data: Joi.object().default({}),
      version: Joi.number().integer(),
      timeCreated: Joi.date(),
      timeUpdated: Joi.date()
    });

    super(server, 'session', schema);
  }

}
