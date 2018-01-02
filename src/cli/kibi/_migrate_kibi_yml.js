import { safeLoad, safeDump } from 'js-yaml';
import { readFileSync as read, writeFileSync as write, renameSync as rename } from 'fs';
import { fromRoot } from '../../utils';
import { has } from 'lodash';

// The keys to be replaced are set as keys in the map
// The new keys to replace the old keys with are the values
// if replacing a nested key and then replacing a higher level key
// in the same nested stanza, replace the lower key first.
// e.g. if the desired end result is to change 'foo.bar.baz' to 'bzz.bar.tah'
// make two entries to the map:
// {
//   'foo.bar.baz': 'tah',
//   'foo': 'bzz'
// }

// The right hand side of the key:value pair contains the string of
// the key that is being replaced at the level of nesting specified on
// the left hand side. e.g.
// {
//   'foo.bar.baz': 'boop'
// }
// converts to 'foo.bar.boop'

const replacementMap = {
  'kibi_access_control.sentinl': 'sirenalert',
  kibi_access_control: 'investigate_access_control',
  kibi_core: 'investigate_core'
};

// This map holds potential value replacements.
// If the key on the left hand side has the value stored as oldVal on the RHS,
// then the key is replaced by the value stored as newVal.
// If the key does not hold the oldVal (e.g. if the user has altered the setting manually
// and diverted from our defaults), leave that value in place.
const valueReplacementMap = {
  'investigate_access_control.admin_role':           { oldVal: 'kibiadmin' },
  'elasticsearch.username':                          { oldVal: 'kibiserver' },
  'investigate_access_control.sirenalert.username' : { oldVal: 'sentinl' }
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

function readFileContents(path) {
  let fileContents;
  try {
    fileContents = read(path, 'utf8');
    return fileContents;
  } catch (e) {
    if(e.code !== 'ENOENT') throw (e);
    return false;
  }
}

function migrateKibiYml({ config: path , dev }) {
  //check if replacing dev yamls
  const newPath = fromRoot(`config/investigate${(dev) ? '.dev' : ''}.yml`);
  if (dev) path = fromRoot('config/kibi.dev.yml');
  const fileContents = readFileContents(path);
  if (!fileContents) {
    throw(`\nNo kibi.yml found to migrate,
This command will migrate your kibi.yml to investigate.yml and update settings
Please ensure you are running the correct command and the config path is correct (if set)`);
  };

  let contents = safeLoad(fileContents);
  // Take the map of old:new keys and convert each config setting in place
  // including nested config options
  // retains the nesting and order of properties
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
  // Set the old defaults into the migrated config.
  // if a user was depending on any old defaults that we are changing,
  // we need to set these explicitly into the config, so the new
  // defaults are not used
  Object.keys(valueReplacementMap).map(key => {
    const addOldDefaultExplicitlyIfMissing = (obj, keys, value) => {
      if (keys.length === 1) {
        obj[keys[0]] = value;
      } else {
        const key = keys.shift();
        obj[key] = addOldDefaultExplicitlyIfMissing(typeof obj[key] === 'undefined' ? {} : obj[key], keys, value);
      }

      return obj;
    };

    if (!has(contents, key)) {
      contents = addOldDefaultExplicitlyIfMissing(contents, key.split('.'), valueReplacementMap[key].oldVal);
    }
  });

  const newYml = safeDump(contents);
  // rename kibi.yml to kibi.yml.pre10
  rename(path, `${path}.pre10`);
  // write yaml output as investigate.yml
  write(newPath, newYml, { encoding: 'utf8' });
}

export default migrateKibiYml;
