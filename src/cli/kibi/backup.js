import KbnServer from '../../server/kbn_server';
import Promise from 'bluebird';
import { merge } from 'lodash';
import readYamlConfig from '../serve/read_yaml_config';
import fromRoot from '../../utils/from_root';
import backupKibiIndex from './backup_kibi_index';
import { resolve } from 'path';

const pathCollector = function () {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

const pluginDirCollector = pathCollector();

/**
 * The command to backup a kibi instance
 */
export default function backupCommand(program) {

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

  async function backup(options) {
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

    const kbnServer = new KbnServer(config);

    await kbnServer.ready();

    let exitCode = 0;
    try {
      await waitForGreenStatus(kbnServer, 10);
      await backupKibiIndex(kbnServer.server, options.backupDir);
    } catch (error) {
      process.stderr.write(`${error}\n`);
      exitCode = 1;
    } finally {
      await kbnServer.close();
    }

    process.exit(exitCode);
  }

  async function processCommand(options) {
    await backup(options);
  }

  program
    .command('backup')
    .description('Backup a Kibi instance')
    .option('--dev', 'Run the backup using development mode configuration')
    .option(
      '-c, --config <path>',
      'Path to the config file, can be changed with the CONFIG_PATH environment variable as well',
      process.env.CONFIG_PATH || fromRoot('config/kibi.dev.yml') || fromRoot('config/kibi.yml')
    )
    .option(
      '--backup-dir <path>',
      'Path to the directory where the Kibi instance data is saved to'
    )
    .option(
      '--plugin-dir <path>',
      'A path to scan for plugins, this can be specified multiple ' +
      'times to specify multiple directories',
      pluginDirCollector, [ fromRoot('src/core_plugins') ]
    )
    .action(processCommand);
};
