import Model from '../model';
import Joi from 'joi';

/**
 * Model for shared URL objects.
 */
export default class URLModel extends Model {
  constructor(server) {

    const schema = Joi.object().keys({
      accessCount: Joi.number(),
      accessDate: Joi.date(),
      createDate: Joi.date(),
      url: Joi.string(),
      sirenSession: Joi.any()
    });

    super(server, 'url', schema, 'Shared link');
  }
}
