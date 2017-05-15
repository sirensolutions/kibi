const instanceMap = Symbol('instanceMap');

/**
 * Holds models for types managed through the Saved Objects API.
 */
export default class TypeRegistry {

  /**
   * Creates a new registry.
   *
   * @param {Server} server - Server instance.
   */
  constructor(server) {
    this._server = server;
    this[instanceMap] = new Map();
  }

  /**
   * Adds a new type to the registry.
   *
   * @param {String} typeName - The type name.
   * @param {Model} model - The model instance.
   */
  set(typeName, model) {
    if (this[instanceMap].has(typeName)) {
      throw new Error(`Another type with name ${typeName} has been already registered.`);
    }
    this[instanceMap].set(typeName, model);
  }

  /**
   * Gets a model instance for the specified type.
   */
  get(typeName) {
    const instance = this[instanceMap].get(typeName);
    if (!instance) {
      throw new Error(`Type ${typeName} not found.`);
    }
    return instance;
  }

  /**
   * @returns an array of objects with two attributes, `type` and `title`.
   */
  list() {
    const types = [];
    this[instanceMap].forEach((model, type) => {
      types.push({
        type,
        title: model.title
      });
    });
    return types;
  }

}
