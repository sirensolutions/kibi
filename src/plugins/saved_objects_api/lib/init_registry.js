import TypeRegistry from './model/registry';

/**
 * Adds builtin types to a new TypeRegistry and returns it.
 *
 * @param {Server} server - A Server instance.
 * @return {TypeRegistry} a TypeRegistry instance.
 */
export default function initRegistry(server) {

  const registry = new TypeRegistry(server);

  const builtin = [
    'session',
    'visualization',
    'index-pattern',
    'config',
    'dashboard',
    'dashboardgroup',
    'query',
    'template',
    'datasource',
    'search'
  ];

  for (const typeName of builtin) {
    const filename = typeName.replace(/-/g, '');
    const ModelClass = require(`./model/builtin/${filename}`);
    registry.set(typeName, new ModelClass(server));
  }

  return registry;

}
