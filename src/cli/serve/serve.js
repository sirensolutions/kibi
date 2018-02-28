import _ from 'lodash';
import { statSync } from 'fs';
import { isWorker } from 'cluster';
import { resolve } from 'path';
import { fromRoot } from '../../utils';
import { getConfig } from '../../server/path';
import readYamlConfig from './read_yaml_config';
import readline from 'readline';
import { validateInvestigateYml, getConfigYmlPath, checkConfigYmlExists } from '../../cli/kibi/validate_config';
import migrateConfigYml from '../../cli/kibi/_migrate_config_yml';
import { basename } from 'path';
import { DEV_SSL_CERT_PATH, DEV_SSL_KEY_PATH } from '../dev_ssl';
import migrationLogger from 'kibiutils/lib/migrations/migration_logger';

let canCluster;
try {
  require.resolve('../cluster/cluster_manager');
  canCluster = true;
} catch (e) {
  canCluster = false;
}

const pathCollector = function () {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

//kibi: Check if there is a plugins folder and return its path if it does
const getPluginsFolder = function () {
  try {
    statSync(fromRoot('plugins'));
    return fromRoot('plugins');
  } catch (err) {
    console.warn('[WARNING] plugins folder is missing, please create one and restart Siren Investigate ...');
    return null;
  }
};
// kibi

const configPathCollector = pathCollector();
const pluginDirCollector = pathCollector();
const pluginPathCollector = pathCollector();

function readServerSettings(opts, extraCliOptions) {
  const settings = readYamlConfig(opts.config);
  const set = _.partial(_.set, settings);
  const get = _.partial(_.get, settings);
  const has = _.partial(_.has, settings);
  const merge = _.partial(_.merge, settings);

  if (opts.dev) {
    set('env', 'development');
    set('optimize.lazy', true);

    if (opts.ssl) {
      set('server.ssl.enabled', true);
    }

    if (opts.ssl && !has('server.ssl.certificate') && !has('server.ssl.key')) {
      set('server.ssl.certificate', DEV_SSL_CERT_PATH);
      set('server.ssl.key', DEV_SSL_KEY_PATH);
    }
  }

  if (opts.elasticsearch) set('elasticsearch.url', opts.elasticsearch);
  if (opts.port) set('server.port', opts.port);
  if (opts.host) set('server.host', opts.host);
  if (opts.quiet) set('logging.quiet', true);
  if (opts.silent) set('logging.silent', true);
  if (opts.verbose) set('logging.verbose', true);
  if (opts.logFile) set('logging.dest', opts.logFile);

  // kibi: let's disable selected plugins. This is done for ui testing
  if (opts.sirenDisablePlugins) {set('siren.disabledPlugins', ['gremlin_server','siren_federate']);};
  // kibi: end

  set('plugins.scanDirs', _.compact([].concat(
    get('plugins.scanDirs'),
    opts.pluginDir
  )));

  set('plugins.paths', _.compact([].concat(
    get('plugins.paths'),
    opts.pluginPath
  )));

  merge(extraCliOptions);

  return settings;
}

module.exports = function (program) {
  const command = program.command('serve');

  command
  .description('Run the kibana server')
  .collectUnknownOptions()
  .option('-e, --elasticsearch <uri>', 'Elasticsearch instance')
  .option(
    '-c, --config <path>',
    'Path to the config file, can be changed with the CONFIG_PATH environment variable as well. ' +
    'Use multiple --config args to include multiple config files.',
    configPathCollector,
    [ getConfig() ]
  )
  .option('-p, --port <port>', 'The port to bind to', parseInt)
  .option('-q, --quiet', 'Prevent all logging except errors')
  .option('-Q, --silent', 'Prevent all logging')
  .option('--verbose', 'Turns on verbose logging')
  .option('-H, --host <host>', 'The host to bind to')
  .option('-l, --log-file <path>', 'The file to log to')
  // kibi: adds option to quit server after optimization
  .option('--quit-after-init', 'Quit the server after a successful initialization.')
  // kibi: end
  .option(
    '--plugin-dir <path>',
    'A path to scan for plugins, this can be specified multiple ' +
    'times to specify multiple directories',
    pluginDirCollector,
    [
      getPluginsFolder(), // kibi: Check if plugins folder exists
      fromRoot('src/core_plugins'),
      // kibi: point to kibi core plugins
      fromRoot('src/kibi_plugins')
    ]
  )
  .option(
    '--plugin-path <path>',
    'A path to a plugin which should be included by the server, ' +
    'this can be specified multiple times to specify multiple paths',
    pluginPathCollector,
    []
  )
  .option('--plugins <path>', 'an alias for --plugin-dir', pluginDirCollector);

  if (canCluster) {
    command
    .option('--dev', 'Run the server with development mode defaults')
    .option('--no-ssl', 'Don\'t run the dev server using HTTPS')
    .option('--no-base-path', 'Don\'t put a proxy in front of the dev server, which adds a random basePath')
    .option('--no-watch', 'Prevents automatic restarts of the server in --dev mode')
    // kibi: extra option adde to be able to ignore investigate.dev.yml when running tests
    .option('--ignoreDevYml', 'Allow to ignore investigate.dev.yml file when running in dev mode. ' +
                              'Useful for running tests like: grunt test:dev --kbnServer.ignoreDevYml')
    .option('--sirenDisablePlugins', 'Tell Investigate not to look for some plugins so we can run UI tests without them');
  }

  command
  .action(async function (opts) {
    if (opts.dev && !opts.ignoreDevYml) {
      try {
        const kbnDevConfig = fromRoot('config/investigate.dev.yml'); // kibi: renamed kibana to investigate
        if (statSync(kbnDevConfig).isFile()) {
          opts.config.push(kbnDevConfig);
        }
      } catch (err) {
      // ignore, kibana.dev.yml does not exist
      }
    }

    const configPath = (opts.dev) ? fromRoot('config/investigate.dev.yml') : opts.config[0];
    const configFilename = basename(configPath);
    const configFilenameNoExt = basename(configPath, '.yml');

    if (!checkConfigYmlExists('kibi', opts.dev) && validateInvestigateYml(configPath, opts.dev)) {
      // kibi: added extra condition !opts.ignoreDevYml

      const getCurrentSettings = () => readServerSettings(opts, this.getUnknownOptions());
      const settings = getCurrentSettings();

      if (canCluster && opts.dev && !isWorker) {
      // stop processing the action and handoff to cluster manager
        const ClusterManager = require('../cluster/cluster_manager');
        new ClusterManager(opts, settings);
        return;
      }

      let kbnServer = {};
      const KbnServer = require('../../server/kbn_server');
      try {
        kbnServer = new KbnServer(settings);
        await kbnServer.ready();
      // kibi: adds option to quit server after optimization
        if (opts.quitAfterInit) {
          process.exit(0);
        }
      // kibi: end
      }
      catch (err) {
        const { server } = kbnServer;

        if (err.code === 'EADDRINUSE') {
          logFatal(`Port ${err.port} is already in use. Another instance of Kibana may be running!`, server);
        } else {
          logFatal(err, server);
        }

        kbnServer.close();
        process.exit(1); // eslint-disable-line no-process-exit
      }

      process.on('SIGHUP', function reloadConfig() {
        const settings = getCurrentSettings();
        kbnServer.server.log(['info', 'config'], 'Reloading logging configuration due to SIGHUP.');
        kbnServer.applyLoggingConfiguration(settings);
        kbnServer.server.log(['info', 'config'], 'Reloaded logging configuration due to SIGHUP.');
      });

      return kbnServer;

    } else if(checkConfigYmlExists('kibi', opts.dev)) {
      const rl = readline.createInterface(process.stdin, process.stdout);
      rl.question(`kibi.yml found in config folder.\n
      Please run bin/investigate upgrade-config to migrate your kibi.yml to investigate.yml
      Please be aware that this command removes all comments in the kibi.yml
      but the original file (with comments) is preserved as kibi.yml.backup.{YYYY-MM-DD-HHmmss}\n
      Would you like to migrate the configuration automatically? [N/y]\n\n`, function (resp) {
        const yes = resp.toLowerCase().trim()[0] === 'y';
        rl.close();

        if (yes) {
          return migrateConfigYml({ config: configPath, dev: opts.dev });
        }
      });
    } else if(!validateInvestigateYml(configPath, opts.dev)) {
      const rl = readline.createInterface(process.stdin, process.stdout);
      rl.question(`Your config file \`${configFilename}\` has some obsolete configuration settings.\n
    You must run \`bin/investigate upgrade-config\` to migrate your ${configFilename} settings
    Please be aware that this command removes all comments in the ${configFilename}
    but the original file (with comments) is preserved as ${configFilename}.backup.{YYYY-MM-DD-HHmmss}\n
    Would you like to migrate the configuration automatically? [N/y]\n\n`, function (resp) {
        const yes = resp.toLowerCase().trim()[0] === 'y';
        rl.close();

        if (yes) {
          return migrateConfigYml({ config: configPath, dev: opts.dev });
        }
      });
    }
  });
};

function logFatal(message, server) {
  if (server) {
    server.log(['fatal'], message);
  }
  console.error('FATAL', message);
}
