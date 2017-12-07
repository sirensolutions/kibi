import toPath from 'lodash/internal/toPath';
import { get } from 'lodash';

export default async function (kbnServer, server, config) {
  const forcedOverride = {
    console: function (enabledInConfig) {
      return !config.get('elasticsearch.tribe.url') && enabledInConfig;
    }
  };

  const { plugins } = kbnServer;

  for (const plugin of plugins) {
    // kibi: check 'gremlin_server'
    if (plugin.pkg.name === 'gremlin_server' && kbnServer.settings.gremlin && kbnServer.settings.gremlin.enabled === false) {
      plugins.disable(plugin);
      // Delete gremlin config to avoid a warning message about unused configuration.
      delete kbnServer.settings.gremlin;
      continue;
    }
    // kibi: end

    // kibi: let's disable selected plugins. This is done for ui testing
    if (get(kbnServer, 'settings.siren.disabledPlugins') && (kbnServer.settings.siren.disabledPlugins.indexOf(plugin.pkg.name) > -1)) {
      plugins.disable(plugin);
      continue;
    }
    // kibi: end

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
