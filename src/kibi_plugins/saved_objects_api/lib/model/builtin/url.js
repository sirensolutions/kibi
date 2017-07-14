import Model from '../model';

/**
 * Model for shared URL objects.
 */
export default class URLModel extends Model {
  constructor(server) {
    super(server, 'url', null, 'Shared link');
  }
}
