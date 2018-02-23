import { safeLoad, safeDump } from 'js-yaml';
import { readFileSync } from 'fs';
import { replacementMap,
         settingsForRemovalIfNotCustomMap,
         settingsForRemoval } from '../../cli/kibi/kibi_to_siren_migration_maps';
import { has } from 'lodash';

export default function validateYml(path) {
  const contents = readFileSync(path);
  const parsedContents = safeLoad(contents);
  const oldKeys = Object.keys(replacementMap)
                        .concat(Object.keys(settingsForRemovalIfNotCustomMap))
                        .concat(settingsForRemoval); // settingsForRemoval is an array so no need for Object.keys

  return !(oldKeys.map(oldKey => {
    return (has(parsedContents, oldKey));
  }).some(v => v));
}