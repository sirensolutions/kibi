import toPath from 'lodash/internal/toPath';

export default async function (kbnServer, server, config) {
  const forcedOverride = {
    console: function (enabledInConfig) {
      return !config.get('elasticsearch.tribe.url') && enabledInConfig;
    }
  };

  const { plugins } = kbnServer;

  for (const plugin of plugins) {
    if (plugin.pkg.name === 'gremlin_server' && kbnServer.settings.gremlin && kbnServer.settings.gremlin.enabled === false) {
      plugins.disable(plugin);
      // Delete gremlin config to avoid a warning message about unused configuration.
      delete kbnServer.settings.gremlin;
      continue;
    }
    const enabledInConfig = config.get([...toPath(plugin.configPrefix), 'enabled']);
    const hasOveride = forcedOverride.hasOwnProperty(plugin.id);
    if (hasOveride) {
      if (!forcedOverride[plugin.id](enabledInConfig)) {
        plugins.disable(plugin);
      }
    } else if (!enabledInConfig) {
      plugins.disable(plugin);
    }
  }

  return;
};
