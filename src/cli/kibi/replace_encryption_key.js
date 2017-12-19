import KbnServer from '../../server/kbn_server';
import Promise from 'bluebird';
import { merge } from 'lodash';
import Logger from './logger';
import readYamlConfig from '../serve/read_yaml_config';
import { resolve } from 'path';
import { fromRoot } from '../../utils/from_root';

const pathCollector = function () {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

const pluginDirCollector = pathCollector();

/**
 * The command to replace the datasource encryption key.
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

  async function replaceEncryptionKey(currentKey, newKey, newCipher, options) {

    const config = readYamlConfig(options.config);
    const logger = new Logger(options);

    merge(
      config,
      {
        env: 'production',
        logging: {
          silent: options.silent,
          quiet: options.quiet,
          verbose: false
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

    try {
      await waitForGreenStatus(kbnServer, 10);
      try {
        const indexHelper = kbnServer.server.plugins.kibi_query_engine.getIndexHelper();
        await indexHelper.rencryptAllValuesInKibiIndex(currentKey, newCipher, newKey, options.config);
        logger.log('Encryption key replaced successfully.');
      } catch (error) {
        logger.error(error.message ? error.message : error);
        process.exit(1);
      }
    } catch (error) {
      logger.error('An error occurred while waiting for the server to be ready, please check the logs.');
      logger.error(error.message ? error.message : error);
      process.exit(1);
    }

    await kbnServer.close();
    process.exit(0);
  }

  async function processCommand(currentKey, newKey, newCipher, options) {
    await replaceEncryptionKey(currentKey, newKey, newCipher, options);
  }

  program
    .command('replace_encryption_key <current_key> <new_key> <new_cipher>')
    .description(
      'Re-encrypts all the datasources and updates the configuration file. ' +
      'The original configuration file is saved with the .bak extension.'
    )
    .option('-q, --quiet', 'Disable all process messaging except errors')
    .option('-s, --silent', 'Disable all process messaging')
    .option(
      '-c, --config <path>',
      'Path to the config file, can be changed with the CONFIG_PATH environment variable as well',
      process.env.CONFIG_PATH || fromRoot('config/kibi.yml'))
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
