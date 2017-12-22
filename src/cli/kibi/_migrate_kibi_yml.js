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
  'investigate_access_control.admin_role':           { oldVal: 'kibiadmin', newVal: 'sirenadmin' },
  'elasticsearch.username':                          { oldVal: 'kibiserver', newVal: 'sirenserver' },
  'investigate_access_control.sirenalert.username' : { oldVal: 'sentinl', newVal: 'sirenalert' }
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

// replace a value in place
function replaceValueAtSpecificPoint(obj, keyOfValueToChange, newKeyObj) {
  let newObj = {};
  const newArr = [];
  Object.keys(obj).map(key => {
    const keyOfValueIsInObject = (key === keyOfValueToChange);
    const valueIsSetToOldDefault = (obj[keyOfValueToChange] === newKeyObj.oldVal);

    if (keyOfValueIsInObject && valueIsSetToOldDefault) {
      newObj[key] = newKeyObj.newVal;
    } else {
      newObj[key] = obj[key];
    }
  });

  return newObj;
}

function migrateKibiYml({ config: path , dev }) {
  //check if replacing dev yamls
  const newPath = fromRoot(`config/investigate${(dev) ? '.dev' : ''}.yml`);
  if (dev) path = fromRoot('config/kibi.dev.yml');
  let contents = safeLoad(read(path, 'utf8'));
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
  // Take the map of old:new values and convert each config setting in place
  // including nested config options
  // retains the nesting and order of properties
  // if an old default has been changed locally, leave it in place.
  // e.g. the old default for admin_role is 'kibiadmin'
  // we want to change it to 'sirenadmin' but if the user has changed it to
  // 'myfirstadmin', don't change to 'sirenadmin' but leave 'myfirstadmin' in place.
  Object.keys(valueReplacementMap).map(key => {
    function _replaceValues(obj, key, keyReplacementObj) {
      if(has(obj, key) && obj.hasOwnProperty(key)) {
        // run replacement function
        obj = Object.assign({},
        replaceValueAtSpecificPoint(obj, key, keyReplacementObj));
      } else if (has(obj, key)) {
        // drop down a nesting level and check again
        const children = Object.keys(obj);
        children.map(childKey => obj[childKey] = _replaceValues(obj[childKey], getChildKey(key), keyReplacementObj));
      }
      return obj;
    }

    contents = _replaceValues(contents, key, valueReplacementMap[key]);
  });

  const newYml = safeDump(contents);
  // rename kibi.yml to kibi.yml.pre10
  rename(path, `${path}.pre10`);
  // write yaml output as investigate.yml
  write(newPath, newYml, { encoding: 'utf8' });
}

export default migrateKibiYml;
