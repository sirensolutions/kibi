import Model from '../model';

/**
 * Model for configuration objects.
 */
export default class ConfigModel extends Model {
  constructor(server) {
    super(server, 'config', null, 'Advanced settings');
  }
}
