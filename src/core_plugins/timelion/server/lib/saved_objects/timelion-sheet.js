import Joi from 'joi';

// siren: Configuration for the timelion-sheet saved object.
const TimelionSheetConfiguration = {
  type: 'timelion-sheet',
  title: 'Timelion Sheet',
  schema: Joi.object().keys({
    title: Joi.string(),
    hits: Joi.number().integer(),
    description: Joi.string().default(null),
    timelion_sheet: Joi.string(),
    timelion_interval: Joi.string(),
    timelion_other_interval: Joi.string(),
    timelion_chart_height: Joi.number().integer(),
    timelion_columns: Joi.number().integer(),
    timelion_rows: Joi.number().integer(),
    version: Joi.number().integer(),
    kibanaSavedObjectMeta: Joi.object().keys({
      searchSourceJSON: Joi.string()
    })
  })

};

export default TimelionSheetConfiguration;
