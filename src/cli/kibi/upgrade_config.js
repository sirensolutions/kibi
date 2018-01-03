import _migrateKibiYml from './_migrate_kibi_yml';
import { fromRoot } from '../../utils';

export default function (program) {
  async function processCommand(options) {
    try {
      await _migrateKibiYml(options);
    } catch(e) {
      process.stderr.write(`${e}\n`);
      process.exit(1);
    }
  }

  program
      .command('upgrade-config')
      .description(
        'Upgrade configuration settings in the config yaml file'
      )
      .option('--dev', 'Run the upgrade using development mode configuration')
      .option(
        '-c, --config <path>',
        'Path to the config file, can be changed with the CONFIG_PATH environment variable as well',
        process.env.CONFIG_PATH || fromRoot('config/kibi.yml'))
      .action(processCommand);
};