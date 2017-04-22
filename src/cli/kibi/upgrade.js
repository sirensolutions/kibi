import KbnServer from '../../server/kbn_server';
import Promise from 'bluebird';
import { merge } from 'lodash';
import readYamlConfig from '../serve/read_yaml_config';
import { resolve } from 'path';
import fromRoot from '../../utils/from_root';
import MigrationRunner from 'kibiutils/lib/migrations/migration_runner';
import MigrationLogger from 'kibiutils/lib/migrations/migration_logger';

const pathCollector = function () {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

const pluginDirCollector = pathCollector();

/**
 * The command to upgrade saved objects.
 */
export default function (program) {

  /**
   * Waits for the kbnServer status to be green.
   *
   * @param {KbnServer} kbnServer A KbnServer instance.
   * @param {Number} retries The number of retries.
   */
  async function waitForGreenStatus(kbnServer, retries) {
    if (retries === 0) {
      throw new Error('Timed out while waiting for the server status to be ' +
                      'green, please check the logs and try again.');
    }
    if (!kbnServer.status.isGreen()) {
      await Promise.delay(2500);
      await waitForGreenStatus(kbnServer, --retries);
    }
  }

  async function upgrade(options) {

    const config = readYamlConfig(options.config);

    if (options.dev) {
      try { merge(config, readYamlConfig(fromRoot('config/kibi.dev.yml'))); }
      catch (e) { null; }
    }

    merge(
      config,
      {
        env: 'production',
        logging: {
          silent: false,
          quiet: false,
          verbose: false,
          dest: 'stdout',
        },
        optimize: {
          enabled: false
        },
        server: {
          autoListen: false
        },
        plugins: {
          initialize: true,
          scanDirs: options.pluginDir
        },
        migrations: {
          enabled: false
        }
      }
    );

    const kbnServer = new KbnServer(config);

    await kbnServer.ready();

    const logger = new MigrationLogger(kbnServer.server, 'migrations');
    const runner = new MigrationRunner(kbnServer.server, logger);

    try {
      await waitForGreenStatus(kbnServer, 10);
      const count = await runner.upgrade();
      if (count > 0) {
        process.stdout.write('Performed' + count + 'upgrade' + (count > 1 ? 's' : '') + '.\n');
      } else {
        process.stdout.write('No objects upgraded.\n');
      }
    } catch (error) {
      process.stderr.write(`${error}\n`);
      process.exit(1);
    }

    await kbnServer.close();
    process.exit(0);
  }

  async function processCommand(options) {
    await upgrade(options);
  }

  program
    .command('upgrade')
    .description(
      'Upgrade saved objects'
    )
    .option('--dev', 'Run the upgrade using development mode configuration')
    .option(
      '-c, --config <path>',
      'Path to the config file, can be changed with the CONFIG_PATH environment variable as well',
      process.env.CONFIG_PATH || fromRoot('config/kibi.dev.yml') || fromRoot('config/kibi.yml'))
    .option(
      '--plugin-dir <path>',
      'A path to scan for plugins, this can be specified multiple ' +
      'times to specify multiple directories',
      pluginDirCollector, [
        fromRoot('plugins'), // installed plugins
        fromRoot('src/core_plugins'), // kibana plugins
        fromRoot('src/kibi_plugins') // kibi plugins
      ]
    )
    .action(processCommand);
};

