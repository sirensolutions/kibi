import Model from '../model';
import Joi from 'joi';

/**
 * Model for doc objects.
 */
export default class DocModel extends Model {

  constructor(server) {
    const schema = Joi.any();
    super(server, 'doc', schema, 'Doc');
  }

}
