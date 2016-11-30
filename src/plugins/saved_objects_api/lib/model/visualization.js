import Joi from 'joi';
import Model from './model';

/**
 * Model for visualization objects.
 */
export default class VisualizationModel extends Model {

  /**
   * Creates a new VisualizationModel.
   *
   * @param {Server} server - A Server instance.
   */
  constructor(server) {

    let schema = Joi.object().keys({
      title: Joi.string(),
      description: Joi.string().default(null),
      visState: Joi.object().default({}),
      uiStateJSON: Joi.string().default(null),
      savedSearchId: 'string',
      version: Joi.number().integer()
    });

    super(server, 'visualization', schema);

  }

}

