import Joi from 'joi';
import Model from '../model';

/**
 * Model for index pattern objects.
 */
export default class OntologyModel extends Model {
  constructor(server) {

    const schema = Joi.object().keys({
      model: Joi.string(),
      version: Joi.number().integer()
    });

    super(server, 'ontology-model', schema, 'Ontology Model');
  }
}
