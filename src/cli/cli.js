import _ from 'lodash';
import { pkg } from '../utils';
import Command from './command';
import serveCommand from './serve/serve';

// kibi: kibi commands
import replaceEncryptionKeyCommand from './kibi/replace_encryption_key';
import upgradeCommand from './kibi/upgrade';
import backupCommand from './kibi/backup';
import restoreCommand from './kibi/restore';
import upgradeConfigCommand from './kibi/upgrade_config';

const argv = process.env.kbnWorkerArgv ? JSON.parse(process.env.kbnWorkerArgv) : process.argv.slice();
const program = new Command('bin/kibi'); // kibi: renamed kibana to kibi

program
.version(pkg.kibi_version)
.description(
  'Kibi extends Kibana with data intelligence features. ' +
  'At the core, kibi can join and filter data live from multiple indexes (elasticsearch) or from SQL/NOSQL sources. ' +
  'Kibana is a trademark of Elasticsearch BV, registered in the U.S. and in other countries.'
);

// kibi: had to check for "upgrade-config" in the list of CLI arguments
// and only attach the config upgrade if it does
// otherwise, the serve command is attached and throws the kibi.yml found error
if(argv.indexOf('upgrade-config') !== -1) {
  upgradeConfigCommand(program);
} else {
  // attach commands
  serveCommand(program);
  // kibi: kibi commands
  replaceEncryptionKeyCommand(program);
  upgradeCommand(program);
  backupCommand(program);
  restoreCommand(program);
}

program
.command('help <command>')
.description('Get the help for a specific command')
.action(function (cmdName) {
  const cmd = _.find(program.commands, { _name: cmdName });
  if (!cmd) return program.error(`unknown command ${cmdName}`);
  cmd.help();
});

program
.command('*', null, { noHelp: true })
.action(function (cmd) {
  program.error(`unknown command ${cmd}`);
});

// check for no command name
const subCommand = argv[2] && !String(argv[2][0]).match(/^-|^\.|\//);

if (!subCommand) {
  if (_.intersection(argv.slice(2), ['-h', '--help']).length) {
    program.defaultHelp();
  } else {
    argv.splice(2, 0, ['serve']);
  }
}

program.parse(argv);
