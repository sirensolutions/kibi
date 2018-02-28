import { safeLoad, safeDump } from 'js-yaml';
import { readFileSync, existsSync } from 'fs';
import { replacementMap,
         settingsForRemoval } from '../../cli/kibi/kibi_to_siren_migration_maps';
import { has } from 'lodash';
import { fromRoot } from '../../utils';

const validateYml = (path) => {
  const contents = readFileSync(path);
  const parsedContents = safeLoad(contents);
  const oldKeys = Object.keys(replacementMap)
                      .concat(settingsForRemoval); // settingsForRemoval is an array so no need for Object.keys

  return !(oldKeys.map(oldKey => {
    return (has(parsedContents, oldKey));
  }).some(v => v));
};

const getConfigYmlPath = (filename, dev) => {
  return fromRoot(`config/${filename}${(dev) ? '.dev' : ''}.yml`);
};

const getConfigFilename = (filename, dev) => {
  return `${filename}${(dev) ? '.dev' : ''}.yml`;
};

const validateInvestigateYml = (configFilePath = null, dev) => {
  const investigateYmlPath = configFilePath || getConfigYmlPath('investigate', dev);

  return validateYml(investigateYmlPath);
};

function checkConfigYmlExists(filename, dev) {
  const kibiYmlPath = getConfigYmlPath(filename, dev);
  return existsSync(kibiYmlPath);
}

export default {
  checkConfigYmlExists,
  getConfigFilename,
  getConfigYmlPath,
  validateInvestigateYml,
  validateYml
};