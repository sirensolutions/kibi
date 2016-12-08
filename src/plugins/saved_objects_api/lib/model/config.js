import Model from './model';

/**
 * Model for configuration objects.
 */
export default class ConfigModel extends Model {

  /**
   * Creates a new ConfigModel.
   *
   * @param server - A Server instance.
   */
  constructor(server) {
    super(server, 'config', null);
  }

}

