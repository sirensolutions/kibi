import { safeLoad, safeDump } from 'js-yaml';
import { readFileSync } from 'fs';
import { replacementMap } from '../../cli/kibi/kibi_to_siren_migration_maps';
import { has } from 'lodash';

export default function validateYml(path) {
  const contents = readFileSync(path);
  const parsedContents = safeLoad(contents);

  return !(Object.keys(replacementMap).map(oldKey => {
    return (has(parsedContents, oldKey));
  }).some(v => v));
}