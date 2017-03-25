import Joi from 'joi';
import Model from '../model';

/**
 * Model for index pattern objects.
 */
export default class IndexPatternModel extends Model {
  constructor(server) {

    const schema = Joi.object().keys({
      title: Joi.string(),
      timeFieldName: Joi.string(),
      notExpandable: Joi.boolean(),
      intervalName: Joi.string(),
      sourceFiltering: Joi.object().default({}),
      paths: Joi.object().default({}),
      fields: Joi.object().default({}),
      fieldFormatMap: Joi.string()
    });

    super(server, 'index-pattern', schema, 'Index pattern');
  }
}
