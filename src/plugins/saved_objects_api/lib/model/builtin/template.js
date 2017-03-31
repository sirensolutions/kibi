import Joi from 'joi';
import Model from '../model';

/**
 * Model for template objects.
 */
export default class TemplateModel extends Model {
  constructor(server) {

    const schema = Joi.object().keys({
      title: Joi.string(),
      description: Joi.string().default(null),
      templateSource: Joi.string(),
      templateEngine: Joi.string(),
      version: Joi.number().integer(),
      kibanaSavedObjectMeta: Joi.object().keys({
        searchSourceJSON: Joi.string()
      })
    });

    super(server, 'template', schema, 'Viewers');
  }
}
