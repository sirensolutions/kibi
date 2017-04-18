import KbnServer from '../../server/kbn_server';
import Promise from 'bluebird';
import { has, get, merge } from 'lodash';
import readYamlConfig from '../serve/read_yaml_config';
import fromRoot from '../../utils/from_root';
import { resolve } from 'path';
import RestoreKibi from './_restore_kibi';
import MigrationRunner from 'kibiutils/lib/migrations/migration_runner';
import MigrationLogger from 'kibiutils/lib/migrations/migration_logger';
import syswidecas from 'syswide-cas';

const pathCollector = function () {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

const pluginDirCollector = pathCollector();

/**
 * The command to restore a kibi instance
 */
export default function restoreCommand(program) {

  /**
   * Waits for the kbnServer status to be green.
   *
   * @param {KbnServer} kbnServer A KbnServer instance.
   * @param {Number} retries The number of retries.
   */
  async function waitForGreenStatus(kbnServer, retries) {
    if (retries === 0) {
      throw new Error('Timed out while waiting for the server status to be green, please check the logs and try again.');
    }
    if (!kbnServer.status.isGreen()) {
      await Promise.delay(2500);
      await waitForGreenStatus(kbnServer, --retries);
    }
  }

  async function restore(options) {
    const config = readYamlConfig(options.config);

    if (options.dev) {
      try {
        merge(config, readYamlConfig(fromRoot('config/kibi.dev.yml')));
      }
      catch (e) {
        // ignore
      }
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
        }
      }
    );

    if (has(config, 'elasticsearch.ssl.ca')) {
      syswidecas.addCAs(get(config, 'elasticsearch.ssl.ca'));
    }

    let exitCode = 0;
    let kbnServer;
    try {
      // restore index
      const restoreKibi = new RestoreKibi(config, options.backupDir);
      await restoreKibi.restore();

      // perform a migration
      kbnServer = new KbnServer(config);

      await kbnServer.ready();
      await waitForGreenStatus(kbnServer, 10);

      const logger = new MigrationLogger(kbnServer.server, 'migrations');
      const runner = new MigrationRunner(kbnServer.server, logger);
      const count = await runner.upgrade();
      if (count > 0) {
        process.stdout.write(`Performed ${count} upgrades.\n`);
      } else {
        process.stdout.write('No objects upgraded.\n');
      }
    } catch (error) {
      process.stderr.write(`${error}\n`);
      exitCode = 1;
    } finally {
      if (kbnServer) {
        await kbnServer.close();
      }
    }

    process.exit(exitCode);
  }

  async function processCommand(options) {
    await restore(options);
  }

  program
    .command('restore')
    .description('Restore a Kibi instance')
    .option('--dev', 'Run the restore command using development mode configuration')
    .option(
      '-c, --config <path>',
      'Path to the config file, can be changed with the CONFIG_PATH environment variable as well',
      process.env.CONFIG_PATH || fromRoot('config/kibi.yml')
    )
    .option(
      '--backup-dir <path>',
      'Path to the file where the Kibi instance data was saved to'
    )
    .option(
      '--plugin-dir <path>',
      'A path to scan for plugins, this can be specified multiple times to specify multiple directories',
      pluginDirCollector, [ fromRoot('src/core_plugins') ]
    )
    .action(processCommand);
};
