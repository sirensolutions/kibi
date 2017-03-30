import TypeRegistry from './model/registry';
import builtin from './model/builtin';

/**
 * Adds builtin types to a new TypeRegistry and returns it.
 *
 * @param {Server} server - A Server instance.
 * @return {TypeRegistry} a TypeRegistry instance.
 */
export default function initRegistry(server) {

  const registry = new TypeRegistry(server);

  for (const typeName of builtin) {
    const filename = typeName.replace(/-/g, '');
    const ModelClass = require(`./model/builtin/${filename}`);
    registry.set(typeName, new ModelClass(server));
  }

  return registry;

}
