import { safeLoad, safeDump } from 'js-yaml';
import { existsSync as exists, readFileSync as read, writeFileSync as write, renameSync as rename } from 'fs';
import { fromRoot } from '../../utils';
import { basename, dirname } from 'path';
import { has, get, isEmpty } from 'lodash';
import { replacementMap, valueReplacementMap, settingsForRemovalIfNotCustomMap, settingsForRemoval } from './kibi_to_siren_migration_maps';
import { validateYml } from './validate_config';
import unset from '../../ui/public/kibi/lodash4/unset';
import set from '../../ui/public/kibi/lodash4/set';
import moment from 'moment';

// The keys to be replaced are set as keys in the replacementMap map
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

// The valueReplacementMap map holds potential value replacements.
// If the user has diverted from the old defaults for e.g. the admin_role
// the user's settings should be retained in the yml.
// On the other hand, if the old defaults haven't been changed, we need to
// set the old defaults explicitly into the config to ensure back compatibility
// with pre-Siren 10 setups

// remove the parent key from the string and return the child key
// e.g. foo.bar.baz becomes bar.baz

// The settingsForRemovalIfNotCustomMap map holds keys and *old* values of
// settings that are to be removed *if the user has not customised them*
// i.e. if the gremlin_server.path is gremlin_server/gremlin-es2-server.jar
// in the config, we remove it. if it has been customised, it is not removed
function readFileContents(path) {
  let fileContents;
  try {
    fileContents = read(path, 'utf8');
    return fileContents;
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    return false;
  }
}

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

function getParentKey(path) {
  const parts = path.split('.');
  if (parts.length > 1) {
    parts.pop();
  }
  const parentKey = parts.join('.');
  if (path === parentKey) {
    return null;
  }
  return parentKey;
}

function checkAndClearParentObjectIfEmpty(o, key) {
  const parentPath = getParentKey(key);
  if (parentPath) {
    const parentValue = get(o, parentPath);
    if (isEmpty(parentValue)) {
      unset(o, parentPath);
      checkAndClearParentObjectIfEmpty(o, parentPath);
    }
  }
}

function migrateSettings(contents) {

  // Remove any obsolete keys first in case there are nested obsolete keys
  // that need to be removed before the parent nodes are renamed.
  settingsForRemoval.map(key => {
    if (has(contents, key)) {
      unset(contents, key);
      checkAndClearParentObjectIfEmpty(contents, key);
    }
  });

  // Take the map of old:new keys and convert each config setting in place
  // including nested config options
  // retains the nesting and order of properties
  Object.keys(replacementMap).map(key => {

    if (has(contents, key)) {
      const value = get(contents, key);
      unset(contents, key);
      checkAndClearParentObjectIfEmpty(contents, key);
      set(contents, replacementMap[key], value);
    }
  });

  // Set the old defaults into the migrated config.
  // if a user was depending on any old defaults that we are changing,
  // we need to set these explicitly into the config, so the new
  // defaults are not used
  Object.keys(valueReplacementMap).map(key => {
    const addOldDefaultExplicitlyIfMissing = (obj, keys, value) => {
      if (keys.length === 1) {
        // If the key is found on this level, we set it to the value in question
        obj[keys[0]] = value;
      } else {
        // If the key is not found on this level, remove it from the front of the keys array and try next level down
        const key = keys.shift();
        // Recursively walk down each branch and check for the key in question.
        obj[key] = addOldDefaultExplicitlyIfMissing(typeof obj[key] === 'undefined' ? {} : obj[key], keys, value);
      }

      return obj;
    };
    // If the nesting level doesn't contain the key in question, we drop down one nesting level and check again
    if (!has(contents, key)) {
      contents = addOldDefaultExplicitlyIfMissing(contents, key.split('.'), valueReplacementMap[key].oldVal);
    }
  });

  // Remove any of the old default settings that have been hardcoded into Investigate only
  // if they have not been customised by the user (e.g. if they are using their own gremlin_server.path, we leave that in the yml)
  // If all the settings in a stanza are removed, the stanza itself is removed from the yml
  Object.keys(settingsForRemovalIfNotCustomMap).map(key => {
    const removeOldSettingIfNotCustom = (obj, keys, value) => {
      if (keys.length === 1) {
        const valueToCheck = obj[keys[0]];
        // If the setting is our old default
        if (valueToCheck === value.oldVal) {
          delete obj[keys[0]];
        }
      } else {
        const key = keys.shift();
        // If the nesting level doesn't contain the key in question, we drop down one nesting level and check again
        obj[key] = Object.assign({}, removeOldSettingIfNotCustom(typeof obj[key] === 'undefined' ? {} : obj[key], keys, value));
        if(Object.keys(obj[key]).length === 0) {
          delete obj[key];
        }
      }

      return obj;
    };

    contents = Object.assign({}, removeOldSettingIfNotCustom(contents, key.split('.'), settingsForRemovalIfNotCustomMap[key]));
  });

  return contents;
}

function migrateConfigYml({ config: path, dev }) {
      //check if replacing dev yamls
  let contents;
  // Handle custom config paths. If the user passes a custom config filepath in,
  // replace its contents but leave its name intact.
  const pathIsDefault = basename(path) === 'kibi.yml' || basename(path) === 'investigate.yml';
  const newPath = pathIsDefault ? `${dirname(path)}/investigate.${(dev) ? 'dev.' : ''}yml` : path;
  if (dev) path = pathIsDefault ? `${dirname(path)}/${basename(path, '.yml')}.dev.yml` : path;
  const kibiContents = readFileContents(path);
  // There is a kibi.yml, kibi.dev.yml OR any config file given by user
  if (kibiContents) {
    contents = migrateSettings(safeLoad(kibiContents));
    // there is no kibi.yml, kibi.dev.yml or any other custom yml passed by the user, but there is an investigate.yml or investigate.dev.yml
  } else if (exists(newPath)) {
    const investigateContents = readFileContents(newPath);
    // There is an investigate.yml or investigate.dev.yml but it's out of date
    if (investigateContents && !validateYml(newPath)) {
      path = newPath;
      contents = migrateSettings(safeLoad(investigateContents));
    } else {
      console.log('config/investigate.yml is up to date. Run bin/investigate to start Siren Investigate.');
      return;
    }
  } else { // There is no kibi.yml and no investigate.yml
    throw(`\nNo config file found to migrate,
This command will migrate your investigate.yml to update settings
Please ensure you are running the correct command and the config path is correct (if set)`);
  }

  const newYml = safeDump(contents);
  // rename kibi.yml to kibi.yml.pre10
  rename(path, `${path}.backup.${moment(new Date()).format('YYYY-MM-DD-HHmmss')}`);
  // write yaml output as investigate.yml (or as the user-defined custom filename)
  write(newPath, newYml, { encoding: 'utf8' });
}

export default migrateConfigYml;
