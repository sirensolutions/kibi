import { safeLoad, safeDump } from 'js-yaml';
import { readFileSync as read, writeFileSync as write, renameSync as rename } from 'fs';
import { fromRoot } from '../../utils';
import { has } from 'lodash';

// The keys to be replaced are set as keys in the map
// The new keys to replace the old keys with are the values
// if replacing a nested key and then replacing a higher level key
// in the same nested stanza, replace the lower key first.
const replacementMap = {
  'kibi_access_control.sentinl': 'sirenalert',
  kibi_access_control: 'investigate_access_control',
  kibi_core: 'investigate_core'
};

// remove the parent key from the string and return the child key
// e.g. foo.bar.baz becomes bar.baz
function getChildKey(key) {
  return key.substr(key.indexOf('.') + 1);
}

// Rename an object property in place
function renamePropAtSpecificPoint(obj, keyToChange, newKeyname) {
  const arr = [];
  const newObj = {};
  Object.keys(obj).map(key => {
    const updatedKey = (keyToChange === key) ? newKeyname : key;
    arr.push({ key: updatedKey, value:obj[key] });
  });

  arr.map(keyObj => {
    newObj[keyObj.key] = keyObj.value;
  });

  return newObj;
}

// Take the map of old:new values and convert each config setting in place
// including nested config options
// retains the nesting and order of properties
function migrateKibiYml({ config: path }) {
  let contents = safeLoad(read(path, 'utf8'));
  Object.keys(replacementMap).map(key => {
    function _replaceKeys(obj, oldKey = '', newKey = '') {
      // if the key (possibly nested) is in the object
      // and is at the current level of nesting
      if (has(obj, oldKey) && obj.hasOwnProperty(oldKey)) {
        obj = Object.assign({}, renamePropAtSpecificPoint(obj, oldKey, newKey));
      // if the key is not at the current level of nesting, look in the next level down
      } else if (has(obj, oldKey)) {
        const children = Object.keys(obj);
        children.map(childKey => obj[childKey] = _replaceKeys(obj[childKey], getChildKey(oldKey), newKey));
      }
      return obj;
    }

    contents = _replaceKeys(contents, key, replacementMap[key]);
  });

  const newYml = safeDump(contents);
  // rename kibi.yml to kibi.yml.pre10
  rename(path, `${path}.pre10`);
  // write yaml output as investigate.yml
  write(fromRoot('config/investigate_test.yml'), newYml, { encoding: 'utf8' });
}

export default function (program) {
  async function processCommand(options) {
    await migrateKibiYml(options);
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