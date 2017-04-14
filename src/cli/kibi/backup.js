import Promise from 'bluebird';
import { merge } from 'lodash';
import readYamlConfig from '../serve/read_yaml_config';
import fromRoot from '../../utils/from_root';
import BackupKibiIndex from './backup_kibi_index';

/**
 * The command to backup a kibi instance
 */
export default function backupCommand(program) {

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

    let exitCode = 0;
    try {
      const backupKibiIndex = new BackupKibiIndex(config, options.backupDir);
      await backupKibiIndex.backup();
    } catch (error) {
      process.stderr.write(`${error}\n`);
      exitCode = 1;
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
      process.env.CONFIG_PATH || fromRoot('config/kibi.yml')
    )
    .option(
      '--backup-dir <path>',
      'Path to the directory where the Kibi instance data is saved to'
    )
    .action(processCommand);
};
