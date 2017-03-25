import Joi from 'joi';
import Model from '../model';

/**
 * Model for visualization objects.
 */
export default class VisualizationModel extends Model {
  constructor(server) {

    const schema  = Joi.object().keys({
      title: Joi.string(),
      description: Joi.string().default(null),
      visState: Joi.object().default({}),
      uiStateJSON: Joi.string().default(null),
      savedSearchId: Joi.string(),
      version: Joi.number().integer(),
      kibanaSavedObjectMeta: Joi.object().keys({
        searchSourceJSON: Joi.string()
      })
    });

    super(server, 'visualization', schema, 'Visualization');
  }
}

