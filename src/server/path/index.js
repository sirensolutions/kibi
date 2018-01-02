import { accessSync, R_OK } from 'fs';
import { find } from 'lodash';
import { fromRoot } from '../../utils';

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
  getConfig: () => findFile(CONFIG_PATHS),
  getData: () => findFile(DATA_PATHS)
};
