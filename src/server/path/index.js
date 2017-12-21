import { accessSync, R_OK } from 'fs';
import { find } from 'lodash';
import { fromRoot } from '../../utils';
import { migrateKibiYml } from './migrate_kibi_yml.js';

const CONFIG_PATHS = [
  process.env.CONFIG_PATH,
  fromRoot('config/investigate.yml') // kibi: use kibi configuration file
  //'/etc/kibana/kibana.yml' kibi: no such config location in kibi
].filter(Boolean);

// kibi: use '/var/lib/kibi'
const DATA_PATHS = [
  process.env.DATA_PATH,
  fromRoot('data'),
  '/var/lib/kibi'
].filter(Boolean);

// kibi
const kibiYmlPath = fromRoot('config/kibi.yml');
function checkKibiYmlExists() {
  try {
    accessSync(kibiYmlPath);
    return true;
  } catch(e) {
    console.log('e', e);
  }
}

function getConfig() {
  if(checkKibiYmlExists()) {
    console.log('kibi.yml.exists');
    migrateKibiYml(kibiYmlPath);
    // return findFile(CONFIG_PATHS);
  } else {
    return findFile(CONFIG_PATHS);
  }
}

// kibi:end

function findFile(paths) {
  const availablePath = find(paths, configPath => {
    try {
      accessSync(configPath, R_OK);
      return true;
    } catch (e) {
      //Check the next path
    }
  });
  return availablePath || paths[0];
}

export default {
  getConfig: () => getConfig(), // kibi: check if kibi.yml exists and migrate if so
  getData: () => findFile(DATA_PATHS)
};
