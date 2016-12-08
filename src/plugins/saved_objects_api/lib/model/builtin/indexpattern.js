import Joi from 'joi';

/**
 * Schema for index pattern objects.
 */
const IndexPatternSchema = Joi.object().keys({
  title: Joi.string(),
  timeFieldName: Joi.string(),
  notExpandable: Joi.boolean(),
  intervalName: Joi.string(),
  sourceFiltering: Joi.object().default({}),
  paths: Joi.object().default({}),
  fields: Joi.object().default({}),
  fieldFormatMap: Joi.string()
});

export default IndexPatternSchema;
