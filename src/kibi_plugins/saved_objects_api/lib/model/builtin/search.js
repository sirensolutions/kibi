import Joi from 'joi';
import Model from '../model';

/**
 * Model for saved search objects.
 */
export default class SearchModel extends Model {

  constructor(server) {
    const schema = Joi.object().keys({
      title: Joi.string(),
      description: Joi.string(),
      hits: Joi.number().integer(),
      columns: Joi.string(),
      sort: Joi.string(),
      version: Joi.number().integer(),
      kibanaSavedObjectMeta: Joi.object().keys({
        searchSourceJSON: Joi.string()
      })
    });

    super(server, 'search', schema, 'Saved search');
  }

}
