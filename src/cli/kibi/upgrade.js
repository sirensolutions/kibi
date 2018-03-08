import KbnServer from '../../server/kbn_server';
import Promise from 'bluebird';
import fs from 'fs';
import { merge, has, get } from 'lodash';
import { validateInvestigateYml, getConfigYmlPath, checkConfigYmlExists, getConfigFilename } from '../../cli/kibi/validate_config';
import migrateConfigYml from './_migrate_config_yml';
import readYamlConfig from '../serve/read_yaml_config';
import { resolve, basename } from 'path';
import { fromRoot } from '../../utils/from_root';
import MigrationRunner from 'kibiutils/lib/migrations/migration_runner';
import MigrationLogger from 'kibiutils/lib/migrations/migration_logger';
import readline from 'readline';
import { existsSync } from 'fs';
import BackupKibi from './_backup_kibi';
import RestoreKibi from './_restore_kibi';

const pathCollector = function () {
  const paths = [];
  return function (path) {
    paths.push(resolve(process.cwd(), path));
    return paths;
  };
};

const pluginDirCollector = pathCollector();

/**
 *  Delete backup folder
 *
 * @param {string} path path of folder
 */
async function deleteBackupFolder(path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach(function (file,index) {
      const curPath = path + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteBackupFolder(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

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

  async function runUpgrade(options, config) {
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
        },
        gremlin: {
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
        process.stdout.write('Performed ' + count + ' upgrade' + (count > 1 ? 's' : '') + '.\n');
      } else {
        process.stdout.write('No objects upgraded.\n');
      }
      await kbnServer.close();
      return true;
    } catch (error) {
      process.stderr.write(`${error}\n`);
      await kbnServer.close();
      return false;
    }
  }

  async function restoreFromBackupFiles(config, folderPath) {
    process.stdout.write('Reverting investigate using backup files\n');
    const restoreKibi = new RestoreKibi(config, folderPath);
    return await restoreKibi.restore();
  }

  async function processCommand(options) {
    let configFilename;
    let configPath;

    if ((options.config.match(/.*investigate.yml$/) === null)) {
      if(!existsSync(options.config)) {
        process.stderr.write('\nYour custom config file (' + options.config + ') was not found.\n\n' +
        'Please check the --config option filepath and try again.\n\n');
        process.exit(1);
      } else {
        configFilename = basename(options.config);
        configPath = options.config;
      }
    } else {
      // If there is no kibi.yml and no investigate.yml
      if (!checkConfigYmlExists('investigate', options.dev) && !checkConfigYmlExists('kibi', options.dev)) {
        process.stderr.write('\nNo config file found. ' +
        'Please ensure you have a kibi.yml or investigate.yml in the \`\/config\` folder.\n\n' +
        'If you have renamed the investigate.yml or kibi.yml, ' +
        'please revert the renaming and run \`bin/investigate upgrade\` again.\n\n');
        process.exit(1);
        // if there is no investigate.yml but there is a kibi.yml
      } else if (!checkConfigYmlExists('investigate', options.dev) && checkConfigYmlExists('kibi', options.dev)) {
        options.config = getConfigYmlPath('kibi', options.dev);
        configFilename = getConfigFilename('kibi', options.dev);
        configPath = (options.dev) ? fromRoot(`config/${configFilename}`) : options.config;
      } else { // there is an investigate.yml
        configFilename = getConfigFilename('investigate', options.dev);
        configPath = (options.dev) ? fromRoot(`config/${configFilename}`) : options.config;
      }
    }

    if (!validateInvestigateYml(configPath, options.dev)) {
      const rl = readline.createInterface(process.stdin, process.stdout);
      rl.question(`\nYour config file \`${configFilename}\` has some obsolete configuration settings.\n
    You must run \`bin/investigate upgrade-config\` to migrate your ${configFilename} settings
    Please be aware that this command removes all comments in the ${configFilename}
    ${(configFilename === 'kibi.yml')
      ? `and renames ${configFilename} to investigate.yml but the original file (with comments) 
    is preserved as ${configFilename}.backup.{YYYY-MM-DD-HHmmss}\n`
      : `but the original file (with comments) is preserved as ${configFilename}.backup.{YYYY-MM-DD-HHmmss}\n`
    }
    Would you like to migrate the configuration automatically? [N/y] `, function (resp) {
        const yes = resp.toLowerCase().trim()[0] === 'y';
        process.stderr.write('\n');
        rl.close();

        if (yes) {
          process.stderr.write('\n');
          return migrateConfigYml({ config: configPath, dev: options.dev });
        }
      });
    } else {
      const config = readYamlConfig(options.config);

      if (options.dev) {
        try { merge(config, readYamlConfig(fromRoot('config/investigate.dev.yml'))); }
        catch (e) { null; }
      }

      const doBackup = !options.dontBackup;
      const folderPath = './src/cli/kibi/backup_' + new Date().toString();

      if (doBackup) {
        const backupKibi = new BackupKibi(config, folderPath);
        await backupKibi.backup();
      }

      const success = await runUpgrade(options, config);
      if (success) {
        if (doBackup && !options.keepBackup) {
          await deleteBackupFolder(folderPath);
        }
        process.exit(0);
      } else {
        if (doBackup) {
          const rl = readline.createInterface(process.stdin, process.stdout);
          rl.question('There is a error during upgrade process. Do you want to restore from backup files [N/y] ', async function (resp) {
            const yes = resp.toLowerCase().trim()[0] === 'y';
            rl.close();

            if (yes) {
              await restoreFromBackupFiles(config,  folderPath);
            }
            if (!options.keepBackup) {
              await deleteBackupFolder(folderPath);
            }
            process.exit(-1);
          });
        }

      }
    }
  }

  program
    .command('upgrade')
    .description(
      'Upgrade saved objects'
    )
    .option('--dev', 'Run the upgrade using development mode configuration')
    .option('--dont-backup', 'Run the upgrade without creating backup')
    .option('--keep-backup', 'Don\'t delete backup files after upgrade process')
    .option(
      '-c, --config <path>',
      'Path to the config file, can be changed with the CONFIG_PATH environment variable as well',
      process.env.CONFIG_PATH || fromRoot('config/investigate.yml'))
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
